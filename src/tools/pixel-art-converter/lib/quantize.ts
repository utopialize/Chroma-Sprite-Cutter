import type { PixelArtDitheringMode, RGB } from '../types';
import { isVisiblePixel } from './palettes';

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const;

const ORDERED_STRENGTH = 32;

export function mapToNearestPaletteColor(
  imageData: ImageData,
  palette: RGB[],
  dithering: PixelArtDitheringMode = 'none',
): ImageData {
  if (dithering === 'ordered') {
    return mapWithOrderedDithering(imageData, palette);
  }
  if (dithering === 'floyd-steinberg') {
    return mapWithFloydSteinbergDithering(imageData, palette);
  }
  return mapWithoutDithering(imageData, palette);
}

function mapWithoutDithering(imageData: ImageData, palette: RGB[]): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = result.data;
  if (palette.length === 0) {
    dst.set(src);
    return result;
  }
  for (let i = 0; i < src.length; i += 4) {
    const alpha = src[i + 3];
    dst[i + 3] = alpha;
    if (!isVisiblePixel(alpha)) {
      copyRgb(src, dst, i);
      continue;
    }
    const chosen = findNearestPaletteColor(src[i], src[i + 1], src[i + 2], palette);
    writeRgb(dst, i, chosen);
  }
  return result;
}

function mapWithOrderedDithering(
  imageData: ImageData,
  palette: RGB[],
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = result.data;
  if (palette.length === 0) {
    dst.set(src);
    return result;
  }
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      const alpha = src[i + 3];
      dst[i + 3] = alpha;
      if (!isVisiblePixel(alpha)) {
        copyRgb(src, dst, i);
        continue;
      }
      const threshold = BAYER_4X4[(y % 4) * 4 + (x % 4)] / 15 - 0.5;
      const offset = threshold * ORDERED_STRENGTH;
      const chosen = findNearestPaletteColor(
        clampByte(src[i] + offset),
        clampByte(src[i + 1] + offset),
        clampByte(src[i + 2] + offset),
        palette,
      );
      writeRgb(dst, i, chosen);
    }
  }
  return result;
}

function mapWithFloydSteinbergDithering(
  imageData: ImageData,
  palette: RGB[],
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = result.data;
  if (palette.length === 0) {
    dst.set(src);
    return result;
  }

  const work = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    work[i] = src[i];
    work[i + 1] = src[i + 1];
    work[i + 2] = src[i + 2];
    work[i + 3] = src[i + 3];
  }

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      const alpha = src[i + 3];
      dst[i + 3] = alpha;
      if (!isVisiblePixel(alpha)) {
        copyRgb(src, dst, i);
        continue;
      }
      const oldR = clampByte(work[i]);
      const oldG = clampByte(work[i + 1]);
      const oldB = clampByte(work[i + 2]);
      const chosen = findNearestPaletteColor(oldR, oldG, oldB, palette);
      writeRgb(dst, i, chosen);
      diffuseError(work, imageData.width, imageData.height, x, y, {
        r: oldR - chosen.r,
        g: oldG - chosen.g,
        b: oldB - chosen.b,
      });
    }
  }
  return result;
}

function diffuseError(
  work: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  error: RGB,
): void {
  addError(work, width, height, x + 1, y, error, 7 / 16);
  addError(work, width, height, x - 1, y + 1, error, 3 / 16);
  addError(work, width, height, x, y + 1, error, 5 / 16);
  addError(work, width, height, x + 1, y + 1, error, 1 / 16);
}

function addError(
  work: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  error: RGB,
  factor: number,
): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const i = (y * width + x) * 4;
  if (!isVisiblePixel(work[i + 3])) return;
  work[i] += error.r * factor;
  work[i + 1] += error.g * factor;
  work[i + 2] += error.b * factor;
}

function findNearestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: RGB[],
): RGB {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let p = 0; p < palette.length; p++) {
    const color = palette[p];
    const dr = r - color.r;
    const dg = g - color.g;
    const db = b - color.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = p;
    }
  }
  return palette[bestIndex];
}

function copyRgb(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  index: number,
): void {
  dst[index] = src[index];
  dst[index + 1] = src[index + 1];
  dst[index + 2] = src[index + 2];
}

function writeRgb(dst: Uint8ClampedArray, index: number, color: RGB): void {
  dst[index] = color.r;
  dst[index + 1] = color.g;
  dst[index + 2] = color.b;
}

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}
