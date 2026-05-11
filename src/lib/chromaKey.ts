import type { ChromaKeySettings, RGB } from '../types/image';

interface YCbCr {
  cb: number;
  cr: number;
}

function rgbToCbCr(r: number, g: number, b: number): YCbCr {
  return {
    cb: -0.168736 * r - 0.331264 * g + 0.5 * b + 128,
    cr: 0.5 * r - 0.418688 * g - 0.081312 * b + 128,
  };
}

function chromaDistanceSq(
  r: number,
  g: number,
  b: number,
  key: YCbCr,
): number {
  const px = rgbToCbCr(r, g, b);
  const dcb = px.cb - key.cb;
  const dcr = px.cr - key.cr;
  return dcb * dcb + dcr * dcr;
}

export function applyChromaKey(
  input: ImageData,
  settings: ChromaKeySettings,
): ImageData {
  const {
    keyColor,
    tolerance,
    softness,
    spillSuppression,
    edgeCleanup,
    preserveDetails,
  } = settings;

  const src = input.data;
  const out = new Uint8ClampedArray(src.length);

  const keyCbCr = rgbToCbCr(keyColor.r, keyColor.g, keyColor.b);
  const lower = tolerance;
  const softWidth = (softness / 100) * 128;
  const upper = tolerance + softWidth;
  const lowerSq = lower * lower;
  const upperSq = upper * upper;
  const spillAmount = clamp01(spillSuppression / 100);

  // preserveDetails maps to gamma on the alpha ramp:
  //   0   -> gamma 0.5 (softer, more pixels become partly transparent)
  //   50  -> gamma 1.0 (linear)
  //   100 -> gamma 2.0 (sharper edges, fewer partial pixels)
  const detailGamma = preserveDetails <= 50
    ? 0.5 + (preserveDetails / 50) * 0.5
    : 1 + ((preserveDetails - 50) / 50);

  const isKeyGreenDominant = keyColor.g > keyColor.r && keyColor.g > keyColor.b;
  const isKeyBlueDominant = keyColor.b > keyColor.r && keyColor.b > keyColor.g;

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const a = src[i + 3];

    const distSq = chromaDistanceSq(r, g, b, keyCbCr);

    let alpha = a;
    if (distSq <= lowerSq) {
      alpha = 0;
    } else if (softWidth > 0 && distSq < upperSq) {
      const dist = Math.sqrt(distSq);
      const ratio = (dist - lower) / softWidth;
      alpha = a * Math.pow(ratio, detailGamma);
    }

    let outR = r;
    let outG = g;
    let outB = b;
    if (spillAmount > 0 && alpha > 0 && alpha < 255) {
      if (isKeyGreenDominant) {
        const maxRB = r > b ? r : b;
        if (g > maxRB) outG = maxRB + (g - maxRB) * (1 - spillAmount);
      } else if (isKeyBlueDominant) {
        const maxRG = r > g ? r : g;
        if (b > maxRG) outB = maxRG + (b - maxRG) * (1 - spillAmount);
      } else {
        const maxGB = g > b ? g : b;
        if (r > maxGB) outR = maxGB + (r - maxGB) * (1 - spillAmount);
      }
    }

    out[i] = outR;
    out[i + 1] = outG;
    out[i + 2] = outB;
    out[i + 3] = alpha;
  }

  if (edgeCleanup > 0) {
    applyEdgeCleanup(out, input.width, input.height, edgeCleanup);
  }

  return new ImageData(out, input.width, input.height);
}

function applyEdgeCleanup(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
): void {
  const threshold = (amount / 100) * 255;
  const original = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = original[idx + 3];
      if (alpha === 0 || alpha === 255) continue;
      if (alpha < threshold) {
        data[idx + 3] = 0;
        continue;
      }
      let minNeighbor = alpha;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nAlpha = original[(ny * width + nx) * 4 + 3];
          if (nAlpha < minNeighbor) minNeighbor = nAlpha;
        }
      }
      const erosion = (amount / 100) * (alpha - minNeighbor);
      data[idx + 3] = Math.max(0, alpha - erosion);
    }
  }
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function samplePixel(
  data: ImageData,
  x: number,
  y: number,
): RGB | null {
  if (x < 0 || y < 0 || x >= data.width || y >= data.height) return null;
  const idx = (Math.floor(y) * data.width + Math.floor(x)) * 4;
  return {
    r: data.data[idx],
    g: data.data[idx + 1],
    b: data.data[idx + 2],
  };
}
