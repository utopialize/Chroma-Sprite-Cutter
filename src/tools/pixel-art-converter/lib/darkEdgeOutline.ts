import type {
  PixelArtDarkEdgeColorMode,
  PixelArtDarkEdgeMode,
  RGB,
} from '../types';
import { isVisiblePixel } from './palettes';

export interface DarkEdgeOutlineSettings {
  enabled: boolean;
  strength: number;
  mode: PixelArtDarkEdgeMode;
  colorMode: PixelArtDarkEdgeColorMode;
  respectPalette: boolean;
  palette?: RGB[];
}

export function applyDarkEdgeOutline(
  imageData: ImageData,
  settings: DarkEdgeOutlineSettings,
): ImageData {
  const strength = clamp01(settings.strength);
  if (!settings.enabled || strength <= 0) {
    return imageData;
  }

  const result = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = result.data;
  dst.set(src);

  const palette =
    settings.respectPalette && settings.palette && settings.palette.length > 0
      ? settings.palette
      : null;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      const alpha = src[i + 3];
      if (!isVisiblePixel(alpha)) continue;

      let amount = 0;
      if (
        (settings.mode === 'external' || settings.mode === 'both') &&
        touchesTransparent(src, imageData.width, imageData.height, x, y)
      ) {
        // External mode reinforces existing silhouette pixels only.
        amount = Math.max(amount, 0.32 * strength);
      }

      if (settings.mode === 'internal' || settings.mode === 'both') {
        const internal = internalTransitionAmount(
          src,
          imageData.width,
          imageData.height,
          x,
          y,
          strength,
        );
        amount = Math.max(amount, internal);
      }

      if (amount <= 0) continue;

      const darkened = darkenColor(
        { r: src[i], g: src[i + 1], b: src[i + 2] },
        amount,
        settings.colorMode,
      );
      const color = palette
        ? findNearestPaletteColor(darkened.r, darkened.g, darkened.b, palette)
        : darkened;

      dst[i] = color.r;
      dst[i + 1] = color.g;
      dst[i + 2] = color.b;
      dst[i + 3] = alpha;
    }
  }

  return result;
}

function touchesTransparent(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return (
    !isVisibleAt(data, width, height, x - 1, y) ||
    !isVisibleAt(data, width, height, x + 1, y) ||
    !isVisibleAt(data, width, height, x, y - 1) ||
    !isVisibleAt(data, width, height, x, y + 1)
  );
}

function internalTransitionAmount(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  strength: number,
): number {
  const i = (y * width + x) * 4;
  const centerLuminance = luminance(data[i], data[i + 1], data[i + 2]);
  const threshold = 42 - strength * 10;
  let visibleNeighbors = 0;
  let strongLightNeighbor = false;

  forEachCardinalNeighbor(width, height, x, y, (nx, ny) => {
    const ni = (ny * width + nx) * 4;
    if (!isVisiblePixel(data[ni + 3])) return;
    visibleNeighbors += 1;
    const neighborLuminance = luminance(data[ni], data[ni + 1], data[ni + 2]);
    if (neighborLuminance - centerLuminance >= threshold) {
      strongLightNeighbor = true;
    }
  });

  // Internal mode only marks the darker side of significant visible transitions.
  if (!strongLightNeighbor || visibleNeighbors < 2) return 0;
  return 0.18 * strength;
}

function isVisibleAt(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  return isVisiblePixel(data[(y * width + x) * 4 + 3]);
}

function forEachCardinalNeighbor(
  width: number,
  height: number,
  x: number,
  y: number,
  visit: (x: number, y: number) => void,
): void {
  if (x > 0) visit(x - 1, y);
  if (x < width - 1) visit(x + 1, y);
  if (y > 0) visit(x, y - 1);
  if (y < height - 1) visit(x, y + 1);
}

function darkenColor(
  color: RGB,
  amount: number,
  mode: PixelArtDarkEdgeColorMode,
): RGB {
  const factor = Math.max(0, 1 - amount * (mode === 'black' ? 1.2 : 1));
  return {
    r: clampByte(color.r * factor),
    g: clampByte(color.g * factor),
    b: clampByte(color.b * factor),
  };
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
    const distance = perceptualDistance(r, g, b, color);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = p;
    }
  }
  return palette[bestIndex];
}

function perceptualDistance(
  r: number,
  g: number,
  b: number,
  color: RGB,
): number {
  const dr = r - color.r;
  const dg = g - color.g;
  const db = b - color.b;
  const meanR = (r + color.r) / 2;
  return (
    (2 + meanR / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - meanR) / 256) * db * db
  );
}

function luminance(r: number, g: number, b: number): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
