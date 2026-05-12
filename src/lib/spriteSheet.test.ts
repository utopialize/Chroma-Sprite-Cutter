import { beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_SPRITESHEET_SETTINGS,
  autoCenterManualFrames,
  buildFramePlan,
} from './spriteSheet';

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
    expect(frames[1].sourceIndex).toBeNull();
    expect(frames[1].sourceRect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('compacts included frames when a source frame is excluded', () => {
    const image = makeImage(12, 4);
    setAlpha(image, 1, 1, 255);
    setAlpha(image, 5, 1, 255);
    setAlpha(image, 9, 1, 255);

    const frames = buildFramePlan(image, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceColumns: 3,
      sourceRows: 1,
      outputColumns: 3,
      outputRows: 1,
      frameWidth: 4,
      frameHeight: 4,
      excludedSourceFrameIndices: [1],
    });

    expect(frames[0].sourceIndex).toBe(0);
    expect(frames[1].sourceIndex).toBe(2);
    expect(frames[2].sourceIndex).toBeNull();
  });

  it('uses manual frame order and names', () => {
    const image = makeImage(12, 4);
    setAlpha(image, 1, 1, 255);
    setAlpha(image, 5, 1, 255);
    setAlpha(image, 9, 1, 255);

    const frames = buildFramePlan(image, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceColumns: 3,
      sourceRows: 1,
      outputColumns: 3,
      outputRows: 1,
      frameWidth: 4,
      frameHeight: 4,
      manualFrames: [
        {
          id: 'custom-2',
          sourceIndex: 2,
          name: 'attack',
          offsetX: 0,
          offsetY: 0,
          locked: false,
        },
        {
          id: 'custom-0',
          sourceIndex: 0,
          name: 'idle',
          offsetX: 0,
          offsetY: 0,
          locked: true,
        },
      ],
    });

    expect(frames[0].sourceIndex).toBe(2);
    expect(frames[0].name).toBe('attack');
    expect(frames[1].sourceIndex).toBe(0);
    expect(frames[1].locked).toBe(true);
    expect(frames[2].sourceIndex).toBeNull();
  });

  it('applies manual frame offsets to draw rectangles', () => {
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
      manualFrames: [
        {
          id: 'offset',
          sourceIndex: 0,
          name: 'shifted',
          offsetX: 2,
          offsetY: -1,
          locked: false,
        },
      ],
    });

    expect(frame.drawRect).toEqual({ x: 3, y: 0, width: 6, height: 6 });
  });

  it('auto-centers each frame horizontally inside its own output cell', () => {
    const image = makeImage(8, 4);
    setAlpha(image, 0, 1, 255);
    setAlpha(image, 3, 1, 16);
    setAlpha(image, 4, 1, 16);
    setAlpha(image, 7, 1, 255);

    const manualFrames = autoCenterManualFrames(
      image,
      {
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
        manualFrames: [
          {
            id: 'left',
            sourceIndex: 0,
            name: 'left',
            offsetX: 0,
            offsetY: 0,
            locked: false,
          },
          {
            id: 'right',
            sourceIndex: 1,
            name: 'right',
            offsetX: 0,
            offsetY: 0,
            locked: false,
          },
        ],
      },
      'x',
    );

    expect(manualFrames[0].offsetX).toBe(1);
    expect(manualFrames[1].offsetX).toBe(-1);
    expect(manualFrames[0].offsetY).toBe(0);
    expect(manualFrames[1].offsetY).toBe(0);
  });

  it('auto-centers each frame vertically inside its own output cell', () => {
    const image = makeImage(4, 8);
    setAlpha(image, 1, 0, 255);
    setAlpha(image, 1, 3, 16);
    setAlpha(image, 1, 4, 16);
    setAlpha(image, 1, 7, 255);

    const manualFrames = autoCenterManualFrames(
      image,
      {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        enabled: true,
        sourceColumns: 1,
        sourceRows: 2,
        outputColumns: 1,
        outputRows: 2,
        frameWidth: 4,
        frameHeight: 4,
        fitMode: 'original',
        anchor: 'center',
        manualFrames: [
          {
            id: 'reference',
            sourceIndex: 0,
            name: 'reference',
            offsetX: 0,
            offsetY: 0,
            locked: false,
          },
          {
            id: 'moving',
            sourceIndex: 1,
            name: 'moving',
            offsetX: 0,
            offsetY: 0,
            locked: false,
          },
        ],
      },
      'y',
    );

    expect(manualFrames[0].offsetY).toBe(1);
    expect(manualFrames[1].offsetY).toBe(-1);
  });

  it('auto-centers only the targeted manual frame selection', () => {
    const image = makeImage(8, 4);
    setAlpha(image, 0, 1, 255);
    setAlpha(image, 3, 1, 16);
    setAlpha(image, 4, 1, 16);
    setAlpha(image, 7, 1, 255);

    const manualFrames = autoCenterManualFrames(
      image,
      {
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
        manualFrames: [
          {
            id: 'left',
            sourceIndex: 0,
            name: 'left',
            offsetX: 0,
            offsetY: 0,
            locked: false,
          },
          {
            id: 'right',
            sourceIndex: 1,
            name: 'right',
            offsetX: 0,
            offsetY: 0,
            locked: false,
          },
        ],
      },
      'x',
      new Set(['left']),
    );

    expect(manualFrames[0].offsetX).toBe(1);
    expect(manualFrames[1].offsetX).toBe(0);
  });
});
