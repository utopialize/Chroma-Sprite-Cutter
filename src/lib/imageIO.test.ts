import { describe, expect, it } from 'vitest';
import {
  buildExportName,
  buildMetadataExportName,
  buildSpriteSheetExportName,
  buildZipExportName,
  canBuildAnimationGif,
} from './imageIO';
import { DEFAULT_SPRITESHEET_SETTINGS } from './spriteSheet';
import type { SpriteSheetBuildResult } from '../types/spriteSheet';

describe('buildExportName', () => {
  it('appends _transparent and .png to a PNG source', () => {
    expect(buildExportName('sprite.png')).toBe('sprite_transparent.png');
  });

  it('handles names with no extension', () => {
    expect(buildExportName('sprite')).toBe('sprite_transparent.png');
  });

  it('replaces non-png extensions with .png', () => {
    expect(buildExportName('hero.jpg')).toBe('hero_transparent.png');
    expect(buildExportName('frame.tiff')).toBe('frame_transparent.png');
  });

  it('handles multi-dot filenames', () => {
    expect(buildExportName('foo.bar.png')).toBe('foo.bar_transparent.png');
  });

  it('handles paths-like names', () => {
    expect(buildExportName('hero_run_01.png')).toBe(
      'hero_run_01_transparent.png',
    );
  });

  it('builds a descriptive sprite sheet export name', () => {
    expect(
      buildSpriteSheetExportName('hero.png', {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        outputColumns: 5,
        outputRows: 2,
        frameWidth: 128,
        frameHeight: 96,
      }),
    ).toBe('hero_spritesheet_5x2_128x96.png');
  });

  it('builds a metadata export name', () => {
    expect(buildMetadataExportName('hero.png')).toBe('hero_metadata.json');
  });

  it('builds a zip export name', () => {
    expect(buildZipExportName('hero.png')).toBe('hero_export.zip');
  });
});

describe('canBuildAnimationGif', () => {
  it('detects available animation frames', () => {
    expect(
      canBuildAnimationGif(makeResult([0, 1]), {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        animationStartFrame: 1,
        animationEndFrame: 2,
      }),
    ).toBe(true);
  });

  it('returns false when every output cell is empty', () => {
    expect(
      canBuildAnimationGif(makeResult([null, null]), {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        animationStartFrame: 1,
        animationEndFrame: 2,
      }),
    ).toBe(false);
  });

  it('clamps out-of-range animation values to available frames', () => {
    expect(
      canBuildAnimationGif(makeResult([0]), {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        animationStartFrame: 2,
        animationEndFrame: 3,
      }),
    ).toBe(true);
  });
});

function makeResult(sourceIndices: Array<number | null>): SpriteSheetBuildResult {
  return {
    imageData: {} as ImageData,
    width: 1,
    height: 1,
    sourceFrames: [],
    frames: sourceIndices.map((sourceIndex, index) => ({
      index,
      sourceIndex,
      empty: sourceIndex === null,
      sourceRect: { x: 0, y: 0, width: 1, height: 1 },
      contentRect: sourceIndex === null ? null : { x: 0, y: 0, width: 1, height: 1 },
      destinationCell: { x: 0, y: 0, width: 1, height: 1 },
      drawRect: sourceIndex === null ? null : { x: 0, y: 0, width: 1, height: 1 },
    })),
  };
}
