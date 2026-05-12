import { describe, expect, it } from 'vitest';
import {
  buildSpriteSheetMetadata,
  buildExportName,
  buildMetadataExportName,
  buildSpriteSheetExportName,
  buildZipExportName,
  buildZipContentSummary,
  canBuildAnimationGif,
  sanitizeFileBaseName,
} from './imageIO';
import { DEFAULT_SPRITESHEET_SETTINGS } from './spriteSheet';
import type { LoadedImage } from '../types/image';
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

  it('uses a custom export base name when provided', () => {
    expect(
      buildSpriteSheetExportName('hero.png', DEFAULT_SPRITESHEET_SETTINGS, {
        fileBaseName: 'knight walk.png',
      }),
    ).toBe('knight_walk_spritesheet_5x2_128x128.png');
    expect(
      buildMetadataExportName('hero.png', { fileBaseName: 'knight walk.png' }),
    ).toBe('knight_walk_metadata.json');
  });

  it('sanitizes file base names', () => {
    expect(sanitizeFileBaseName(' boss:attack 01.png ')).toBe('boss_attack_01');
    expect(sanitizeFileBaseName('***')).toBe('sprite');
  });

  it('describes zip package contents for the UI', () => {
    const summary = buildZipContentSummary(
      'hero.png',
      { ...DEFAULT_SPRITESHEET_SETTINGS, enabled: true },
      {
        fileBaseName: 'knight',
        metadataPreset: 'phaser',
      },
    );
    expect(summary.map((item) => item.name)).toContain(
      'knight_spritesheet_5x2_128x128.png',
    );
    expect(summary.map((item) => item.name)).toContain('knight_metadata.json');
    expect(summary.some((item) => item.detail.includes('Phaser atlas'))).toBe(true);
  });
});

describe('buildSpriteSheetMetadata', () => {
  it('builds generic metadata by default', () => {
    const metadata = buildSpriteSheetMetadata(
      makeImage('hero.png'),
      DEFAULT_SPRITESHEET_SETTINGS,
      makeResult([0, 1]),
    ) as { preset: string; file: string };

    expect(metadata.preset).toBe('generic');
    expect(metadata.file).toBe('hero_spritesheet_5x2_128x128.png');
  });

  it('builds Aseprite-like metadata', () => {
    const metadata = buildSpriteSheetMetadata(
      makeImage('hero.png'),
      DEFAULT_SPRITESHEET_SETTINGS,
      makeResult([0, 1]),
      { metadataPreset: 'aseprite', fileBaseName: 'knight' },
    ) as { frames: Record<string, unknown>; meta: { image: string } };

    expect(metadata.meta.image).toBe('knight_spritesheet_5x2_128x128.png');
    expect(metadata.frames['frame_001.png']).toBeDefined();
  });

  it('builds Phaser atlas metadata', () => {
    const metadata = buildSpriteSheetMetadata(
      makeImage('hero.png'),
      DEFAULT_SPRITESHEET_SETTINGS,
      makeResult([0]),
      { metadataPreset: 'phaser' },
    ) as { textures: Array<{ frames: unknown[] }> };

    expect(metadata.textures[0].frames).toHaveLength(1);
  });

  it('exports all named animations and the active animation id', () => {
    const metadata = buildSpriteSheetMetadata(
      makeImage('hero.png'),
      {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        animations: [
          {
            id: 'idle',
            name: 'idle',
            startFrame: 1,
            endFrame: 2,
            fps: 8,
            loop: true,
            pingPong: false,
          },
          {
            id: 'attack',
            name: 'attack',
            startFrame: 2,
            endFrame: 3,
            fps: 12,
            loop: false,
            pingPong: true,
          },
        ],
        activeAnimationId: 'attack',
      },
      makeResult([0, 1, 2]),
    ) as {
      activeAnimationId: string;
      animations: Array<{ id: string; name: string }>;
    };

    expect(metadata.activeAnimationId).toBe('attack');
    expect(metadata.animations.map((item) => item.name)).toEqual([
      'idle',
      'attack',
    ]);
  });

  it('builds Godot metadata', () => {
    const metadata = buildSpriteSheetMetadata(
      makeImage('hero.png'),
      DEFAULT_SPRITESHEET_SETTINGS,
      makeResult([0]),
      { metadataPreset: 'godot' },
    ) as { type: string; hframes: number; vframes: number };

    expect(metadata.type).toBe('godot-spritesheet');
    expect(metadata.hframes).toBe(DEFAULT_SPRITESHEET_SETTINGS.outputColumns);
    expect(metadata.vframes).toBe(DEFAULT_SPRITESHEET_SETTINGS.outputRows);
  });

  it('builds Unity metadata', () => {
    const metadata = buildSpriteSheetMetadata(
      makeImage('hero.png'),
      DEFAULT_SPRITESHEET_SETTINGS,
      makeResult([0]),
      { metadataPreset: 'unity' },
    ) as { type: string; spriteMode: string };

    expect(metadata.type).toBe('unity-spritesheet');
    expect(metadata.spriteMode).toBe('Multiple');
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
      id: `frame-${index}`,
      index,
      name: `frame_${String(index + 1).padStart(3, '0')}`,
      sourceIndex,
      offsetX: 0,
      offsetY: 0,
      locked: false,
      empty: sourceIndex === null,
      sourceRect: { x: 0, y: 0, width: 1, height: 1 },
      contentRect: sourceIndex === null ? null : { x: 0, y: 0, width: 1, height: 1 },
      destinationCell: { x: 0, y: 0, width: 1, height: 1 },
      drawRect: sourceIndex === null ? null : { x: 0, y: 0, width: 1, height: 1 },
    })),
  };
}

function makeImage(name: string): LoadedImage {
  return { name } as LoadedImage;
}
