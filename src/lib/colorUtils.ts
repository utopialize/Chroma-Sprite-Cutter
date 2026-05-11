import type { RGB } from '../types/image';

export function hexToRgb(hex: string): RGB {
  const value = hex.replace(/^#/, '');
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function autoDetectKeyColor(image: HTMLImageElement): RGB {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width === 0 || height === 0) return { r: 0, g: 255, b: 0 };

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 0, g: 255, b: 0 };
  ctx.drawImage(image, 0, 0);

  const x1 = Math.max(0, width - 1);
  const y1 = Math.max(0, height - 1);
  const samples: Uint8ClampedArray[] = [
    ctx.getImageData(0, 0, 1, 1).data,
    ctx.getImageData(x1, 0, 1, 1).data,
    ctx.getImageData(0, y1, 1, 1).data,
    ctx.getImageData(x1, y1, 1, 1).data,
  ];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const s of samples) {
    sumR += s[0];
    sumG += s[1];
    sumB += s[2];
  }
  return {
    r: Math.round(sumR / samples.length),
    g: Math.round(sumG / samples.length),
    b: Math.round(sumB / samples.length),
  };
}
