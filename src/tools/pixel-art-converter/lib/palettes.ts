import type { PixelArtPalettePresetId, RGB } from '../types';

export const COLOR_COUNT_PRESETS = [8, 16, 24, 32, 48, 64] as const;

export const PALETTE_ALPHA_THRESHOLD = 10;

export interface PalettePreset {
  id: PixelArtPalettePresetId;
  name: string;
  colors: RGB[];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'game-boy-4',
    name: 'Game Boy 4 colors',
    colors: [
      { r: 15, g: 56, b: 15 },
      { r: 48, g: 98, b: 48 },
      { r: 139, g: 172, b: 15 },
      { r: 155, g: 188, b: 15 },
    ],
  },
  {
    id: 'pico-8-16',
    name: 'PICO-8 16 colors',
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 29, g: 43, b: 83 },
      { r: 126, g: 37, b: 83 },
      { r: 0, g: 135, b: 81 },
      { r: 171, g: 82, b: 54 },
      { r: 95, g: 87, b: 79 },
      { r: 194, g: 195, b: 199 },
      { r: 255, g: 241, b: 232 },
      { r: 255, g: 0, b: 77 },
      { r: 255, g: 163, b: 0 },
      { r: 255, g: 236, b: 39 },
      { r: 0, g: 228, b: 54 },
      { r: 41, g: 173, b: 255 },
      { r: 131, g: 118, b: 156 },
      { r: 255, g: 119, b: 168 },
      { r: 255, g: 204, b: 170 },
    ],
  },
  {
    id: 'nes-like-32',
    name: 'NES-like 32 colors',
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 124, g: 124, b: 124 },
      { r: 188, g: 188, b: 188 },
      { r: 252, g: 252, b: 252 },
      { r: 0, g: 0, b: 252 },
      { r: 0, g: 0, b: 188 },
      { r: 68, g: 40, b: 188 },
      { r: 148, g: 0, b: 132 },
      { r: 168, g: 0, b: 32 },
      { r: 168, g: 16, b: 0 },
      { r: 136, g: 20, b: 0 },
      { r: 80, g: 48, b: 0 },
      { r: 0, g: 120, b: 0 },
      { r: 0, g: 104, b: 0 },
      { r: 0, g: 88, b: 0 },
      { r: 0, g: 64, b: 88 },
      { r: 0, g: 120, b: 248 },
      { r: 0, g: 88, b: 248 },
      { r: 104, g: 68, b: 252 },
      { r: 216, g: 0, b: 204 },
      { r: 228, g: 0, b: 88 },
      { r: 248, g: 56, b: 0 },
      { r: 228, g: 92, b: 16 },
      { r: 172, g: 124, b: 0 },
      { r: 0, g: 184, b: 0 },
      { r: 0, g: 168, b: 0 },
      { r: 0, g: 168, b: 68 },
      { r: 0, g: 136, b: 136 },
      { r: 60, g: 188, b: 252 },
      { r: 104, g: 136, b: 252 },
      { r: 152, g: 120, b: 248 },
      { r: 248, g: 120, b: 248 },
    ],
  },
  {
    id: 'grayscale-8',
    name: 'Grayscale 8 colors',
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 36, g: 36, b: 36 },
      { r: 73, g: 73, b: 73 },
      { r: 109, g: 109, b: 109 },
      { r: 146, g: 146, b: 146 },
      { r: 182, g: 182, b: 182 },
      { r: 219, g: 219, b: 219 },
      { r: 255, g: 255, b: 255 },
    ],
  },
];

export function getPalettePreset(
  id: PixelArtPalettePresetId,
): PalettePreset {
  return (
    PALETTE_PRESETS.find((preset) => preset.id === id) ?? PALETTE_PRESETS[0]
  );
}

export function isVisiblePixel(alpha: number): boolean {
  return alpha >= PALETTE_ALPHA_THRESHOLD;
}

export function extractPalette(
  imageData: ImageData,
  colorCount: number,
): RGB[] {
  const target = Math.max(1, Math.floor(colorCount));
  const samples = collectOpaqueSamples(imageData);
  if (samples.length === 0) return [];

  let buckets: RGB[][] = [samples];
  while (buckets.length < target) {
    const candidate = pickWidestBucket(buckets);
    if (!candidate) break;
    const { index, channel } = candidate;
    const bucket = buckets[index];
    bucket.sort((a, b) => a[channel] - b[channel]);
    const mid = bucket.length >> 1;
    const left = bucket.slice(0, mid);
    const right = bucket.slice(mid);
    if (left.length === 0 || right.length === 0) break;
    buckets.splice(index, 1, left, right);
  }

  return buckets.filter((bucket) => bucket.length > 0).map(averageColor);
}

function collectOpaqueSamples(imageData: ImageData): RGB[] {
  const data = imageData.data;
  const samples: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (!isVisiblePixel(data[i + 3])) continue;
    samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  return samples;
}

function pickWidestBucket(
  buckets: RGB[][],
): { index: number; channel: 'r' | 'g' | 'b' } | null {
  let bestIndex = -1;
  let bestRange = -1;
  let bestChannel: 'r' | 'g' | 'b' = 'r';
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    if (bucket.length < 2) continue;
    const ranges = channelRanges(bucket);
    const widest = Math.max(ranges.r, ranges.g, ranges.b);
    if (widest > bestRange) {
      bestRange = widest;
      bestIndex = i;
      bestChannel =
        ranges.r === widest ? 'r' : ranges.g === widest ? 'g' : 'b';
    }
  }
  if (bestIndex === -1) return null;
  return { index: bestIndex, channel: bestChannel };
}

function channelRanges(bucket: RGB[]): { r: number; g: number; b: number } {
  let rMin = 255;
  let rMax = 0;
  let gMin = 255;
  let gMax = 0;
  let bMin = 255;
  let bMax = 0;
  for (const pixel of bucket) {
    if (pixel.r < rMin) rMin = pixel.r;
    if (pixel.r > rMax) rMax = pixel.r;
    if (pixel.g < gMin) gMin = pixel.g;
    if (pixel.g > gMax) gMax = pixel.g;
    if (pixel.b < bMin) bMin = pixel.b;
    if (pixel.b > bMax) bMax = pixel.b;
  }
  return { r: rMax - rMin, g: gMax - gMin, b: bMax - bMin };
}

function averageColor(bucket: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const pixel of bucket) {
    r += pixel.r;
    g += pixel.g;
    b += pixel.b;
  }
  return {
    r: Math.round(r / bucket.length),
    g: Math.round(g / bucket.length),
    b: Math.round(b / bucket.length),
  };
}
