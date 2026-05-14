export type EdgeEnhancementMode = 'subtle' | 'strong';

export interface EdgeEnhancementSettings {
  enabled: boolean;
  strength: number;
  mode: EdgeEnhancementMode;
  protectAlphaEdges: boolean;
}

export const DEFAULT_EDGE_ENHANCEMENT: EdgeEnhancementSettings = {
  enabled: false,
  strength: 0.5,
  mode: 'subtle',
  protectAlphaEdges: true,
};

const ALPHA_THRESHOLD = 10;
const EDGE_NORMALIZATION = 48;
const MAX_DELTA_SUBTLE = 36;
const MAX_DELTA_STRONG = 60;
const SUBTLE_DARKEN_FACTOR = 0.45;

export function applyEdgeEnhancement(
  imageData: ImageData,
  settings: EdgeEnhancementSettings,
): ImageData {
  const strength = clamp01(settings.strength);
  if (!settings.enabled || strength === 0) {
    return imageData;
  }

  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const out = new ImageData(width, height);
  const dst = out.data;
  dst.set(src);

  const maxDelta =
    settings.mode === 'strong' ? MAX_DELTA_STRONG : MAX_DELTA_SUBTLE;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = src[idx + 3];
      if (alpha < ALPHA_THRESHOLD) continue;

      const leftIdx = neighborIndex(x - 1, y, width, height);
      const rightIdx = neighborIndex(x + 1, y, width, height);
      const upIdx = neighborIndex(x, y - 1, width, height);
      const downIdx = neighborIndex(x, y + 1, width, height);

      if (settings.protectAlphaEdges) {
        if (
          src[leftIdx + 3] < ALPHA_THRESHOLD ||
          src[rightIdx + 3] < ALPHA_THRESHOLD ||
          src[upIdx + 3] < ALPHA_THRESHOLD ||
          src[downIdx + 3] < ALPHA_THRESHOLD
        ) {
          continue;
        }
      }

      const lumC = luminance(src[idx], src[idx + 1], src[idx + 2]);
      const lumL = luminance(src[leftIdx], src[leftIdx + 1], src[leftIdx + 2]);
      const lumR = luminance(
        src[rightIdx],
        src[rightIdx + 1],
        src[rightIdx + 2],
      );
      const lumU = luminance(src[upIdx], src[upIdx + 1], src[upIdx + 2]);
      const lumD = luminance(src[downIdx], src[downIdx + 1], src[downIdx + 2]);

      const edgeStrength = Math.min(
        1,
        (Math.abs(lumC - lumL) +
          Math.abs(lumC - lumR) +
          Math.abs(lumC - lumU) +
          Math.abs(lumC - lumD)) /
          (4 * EDGE_NORMALIZATION),
      );
      if (edgeStrength === 0) continue;

      const neighborMean = (lumL + lumR + lumU + lumD) / 4;
      const direction = lumC >= neighborMean ? 1 : -1;
      let amount = edgeStrength * strength * maxDelta;
      if (settings.mode === 'subtle' && direction < 0) {
        amount *= SUBTLE_DARKEN_FACTOR;
      }
      const delta = direction * amount;

      dst[idx] = clampByte(src[idx] + delta);
      dst[idx + 1] = clampByte(src[idx + 1] + delta);
      dst[idx + 2] = clampByte(src[idx + 2] + delta);
    }
  }

  return out;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function neighborIndex(
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
  const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
  return (cy * width + cx) * 4;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clampByte(value: number): number {
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 255) return 255;
  return rounded;
}
