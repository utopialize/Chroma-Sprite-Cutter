import { beforeAll, describe, expect, it } from 'vitest';
import { applyChromaKey, samplePixel } from './chromaKey';
import type { ChromaKeySettings } from '../types/image';

beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    class ImageDataPolyfill {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      readonly colorSpace = 'srgb';
      constructor(
        data: Uint8ClampedArray | number,
        width: number,
        height?: number,
      ) {
        if (data instanceof Uint8ClampedArray) {
          this.data = data;
          this.width = width;
          this.height = height ?? data.length / 4 / width;
        } else {
          this.width = data;
          this.height = width;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    }
    (globalThis as { ImageData: unknown }).ImageData = ImageDataPolyfill;
  }
});

const BASE_SETTINGS: ChromaKeySettings = {
  keyColor: { r: 0, g: 255, b: 0 },
  tolerance: 30,
  softness: 0,
  spillSuppression: 0,
  edgeCleanup: 0,
  preserveDetails: 50,
};

function makeRow(...pixels: Array<[number, number, number, number]>): ImageData {
  const data = new Uint8ClampedArray(pixels.flatMap((p) => p));
  return new ImageData(data, pixels.length, 1);
}

describe('applyChromaKey', () => {
  it('makes the key color fully transparent', () => {
    const input = makeRow([0, 255, 0, 255]);
    const out = applyChromaKey(input, BASE_SETTINGS);
    expect(out.data[3]).toBe(0);
  });

  it('keeps unrelated colors fully opaque', () => {
    const input = makeRow([255, 0, 0, 255]);
    const out = applyChromaKey(input, BASE_SETTINGS);
    expect(out.data[3]).toBe(255);
  });

  it('keeps the same dimensions', () => {
    const input = makeRow(
      [0, 255, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    );
    const out = applyChromaKey(input, BASE_SETTINGS);
    expect(out.width).toBe(3);
    expect(out.height).toBe(1);
    expect(out.data.length).toBe(12);
  });

  it('produces partially transparent pixels in the soft band', () => {
    const input = makeRow([60, 200, 60, 255]);
    const out = applyChromaKey(input, {
      ...BASE_SETTINGS,
      tolerance: 20,
      softness: 80,
    });
    expect(out.data[3]).toBeGreaterThan(0);
    expect(out.data[3]).toBeLessThan(255);
  });

  it('reduces green channel on semi-transparent pixels when spill suppression is on', () => {
    const input = makeRow([100, 200, 100, 255]);
    const noSpill = applyChromaKey(input, {
      ...BASE_SETTINGS,
      tolerance: 20,
      softness: 80,
      spillSuppression: 0,
    });
    const withSpill = applyChromaKey(input, {
      ...BASE_SETTINGS,
      tolerance: 20,
      softness: 80,
      spillSuppression: 100,
    });
    expect(withSpill.data[1]).toBeLessThan(noSpill.data[1]);
  });

  it('returns input unchanged when key is far from every pixel', () => {
    const input = makeRow(
      [255, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    );
    const out = applyChromaKey(input, BASE_SETTINGS);
    expect(out.data[3]).toBe(255);
    expect(out.data[7]).toBe(255);
    expect(out.data[11]).toBe(255);
  });

  it('clears partial-alpha pixels when edgeCleanup is maxed', () => {
    const input = makeRow([50, 200, 50, 255]);
    const partial = applyChromaKey(input, {
      ...BASE_SETTINGS,
      tolerance: 10,
      softness: 100,
      edgeCleanup: 0,
    });
    expect(partial.data[3]).toBeGreaterThan(0);
    expect(partial.data[3]).toBeLessThan(255);

    const cleaned = applyChromaKey(input, {
      ...BASE_SETTINGS,
      tolerance: 10,
      softness: 100,
      edgeCleanup: 100,
    });
    expect(cleaned.data[3]).toBe(0);
  });
});

describe('samplePixel', () => {
  it('returns the RGB at integer coordinates', () => {
    const input = makeRow([10, 20, 30, 255], [40, 50, 60, 255]);
    expect(samplePixel(input, 0, 0)).toEqual({ r: 10, g: 20, b: 30 });
    expect(samplePixel(input, 1, 0)).toEqual({ r: 40, g: 50, b: 60 });
  });

  it('returns null for out-of-bounds coordinates', () => {
    const input = makeRow([0, 0, 0, 255]);
    expect(samplePixel(input, -1, 0)).toBeNull();
    expect(samplePixel(input, 5, 0)).toBeNull();
    expect(samplePixel(input, 0, 1)).toBeNull();
  });
});
