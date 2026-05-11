import { describe, expect, it } from 'vitest';
import {
  buildExportName,
  buildMetadataExportName,
  buildSpriteSheetExportName,
} from './imageIO';
import { DEFAULT_SPRITESHEET_SETTINGS } from './spriteSheet';

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
});
