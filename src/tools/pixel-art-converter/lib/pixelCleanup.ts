import type { RGB } from '../types';
import { isVisiblePixel } from './palettes';

export interface PixelCleanupSettings {
  enabled: boolean;
  strength: number;
}

interface NeighborVote {
  color: RGB;
  count: number;
}

export function applyPixelCleanup(
  imageData: ImageData,
  settings: PixelCleanupSettings,
): ImageData {
  const strength = clamp01(settings.strength);
  if (!settings.enabled || strength <= 0) {
    return imageData;
  }

  const result = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = result.data;
  dst.set(src);

  const requiredMajority = strength < 0.5 ? 5 : strength < 0.85 ? 4 : 3;
  const maxSameColorNeighbors = strength < 0.5 ? 1 : 2;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      const alpha = src[i + 3];
      if (!isVisiblePixel(alpha)) continue;

      const sameColorNeighbors = countSameColorNeighbors(
        src,
        imageData.width,
        imageData.height,
        x,
        y,
      );
      if (sameColorNeighbors > maxSameColorNeighbors) continue;

      const winner = majorityNeighborColor(
        src,
        imageData.width,
        imageData.height,
        x,
        y,
      );
      if (!winner || winner.count < requiredMajority) continue;

      dst[i] = winner.color.r;
      dst[i + 1] = winner.color.g;
      dst[i + 2] = winner.color.b;
      dst[i + 3] = alpha;
    }
  }

  return result;
}

function countSameColorNeighbors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const center = (y * width + x) * 4;
  let count = 0;
  forEachNeighbor(width, height, x, y, (nx, ny) => {
    const i = (ny * width + nx) * 4;
    if (!isVisiblePixel(data[i + 3])) return;
    if (
      data[i] === data[center] &&
      data[i + 1] === data[center + 1] &&
      data[i + 2] === data[center + 2]
    ) {
      count += 1;
    }
  });
  return count;
}

function majorityNeighborColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): NeighborVote | null {
  const votes = new Map<string, NeighborVote>();
  forEachNeighbor(width, height, x, y, (nx, ny) => {
    const i = (ny * width + nx) * 4;
    if (!isVisiblePixel(data[i + 3])) return;
    const color = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const key = `${color.r},${color.g},${color.b}`;
    const vote = votes.get(key);
    if (vote) {
      vote.count += 1;
      return;
    }
    votes.set(key, { color, count: 1 });
  });

  let best: NeighborVote | null = null;
  for (const vote of votes.values()) {
    if (!best || vote.count > best.count) best = vote;
  }
  return best;
}

function forEachNeighbor(
  width: number,
  height: number,
  x: number,
  y: number,
  visit: (x: number, y: number) => void,
): void {
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      visit(nx, ny);
    }
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
