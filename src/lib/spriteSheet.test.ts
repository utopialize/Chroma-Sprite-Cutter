import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SPRITESHEET_SETTINGS, buildFramePlan } from './spriteSheet';

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

function makeImage(width: number, height: number): ImageData {
  return new ImageData(new Uint8ClampedArray(width * height * 4), width, height);
}

function setAlpha(data: ImageData, x: number, y: number, alpha: number): void {
  data.data[(y * data.width + x) * 4 + 3] = alpha;
}

describe('buildFramePlan', () => {
  it('detects visible content inside each source grid cell', () => {
    const image = makeImage(8, 4);
    setAlpha(image, 1, 1, 255);
    setAlpha(image, 2, 1, 255);
    setAlpha(image, 5, 2, 255);

    const frames = buildFramePlan(image, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceColumns: 2,
      sourceRows: 1,
      outputColumns: 2,
      outputRows: 1,
      frameWidth: 4,
      frameHeight: 4,
      fitMode: 'original',
      anchor: 'center',
    });

    expect(frames).toHaveLength(2);
    expect(frames[0].contentRect).toEqual({ x: 1, y: 1, width: 2, height: 1 });
    expect(frames[1].contentRect).toEqual({ x: 5, y: 2, width: 1, height: 1 });
  });

  it('bottom-aligns contained sprites when bottom-center is selected', () => {
    const image = makeImage(4, 4);
    setAlpha(image, 0, 0, 255);
    setAlpha(image, 1, 1, 255);

    const [frame] = buildFramePlan(image, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceColumns: 1,
      sourceRows: 1,
      outputColumns: 1,
      outputRows: 1,
      frameWidth: 8,
      frameHeight: 8,
      fitMode: 'contain',
      anchor: 'bottom-center',
      padding: 1,
    });

    expect(frame.drawRect).toEqual({ x: 1, y: 1, width: 6, height: 6 });
  });

  it('marks missing output cells as empty', () => {
    const image = makeImage(2, 2);
    const frames = buildFramePlan(image, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceColumns: 1,
      sourceRows: 1,
      outputColumns: 2,
      outputRows: 1,
      frameWidth: 4,
      frameHeight: 4,
    });

    expect(frames[0].empty).toBe(true);
    expect(frames[1].empty).toBe(true);
    expect(frames[1].sourceRect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
