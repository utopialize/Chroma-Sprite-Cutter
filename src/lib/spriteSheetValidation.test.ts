import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRITESHEET_SETTINGS } from './spriteSheet';
import { validateSpriteSheetSettings } from './spriteSheetValidation';
import type { LoadedImage } from '../types/image';

const IMAGE: LoadedImage = {
  element: {} as HTMLImageElement,
  width: 512,
  height: 256,
  name: 'hero.png',
  size: 1000,
  type: 'image/png',
};

describe('validateSpriteSheetSettings', () => {
  it('returns no diagnostics when sheet building is disabled', () => {
    expect(
      validateSpriteSheetSettings(IMAGE, {
        ...DEFAULT_SPRITESHEET_SETTINGS,
        enabled: false,
      }),
    ).toEqual([]);
  });

  it('warns when source and output frame counts differ', () => {
    const diagnostics = validateSpriteSheetSettings(IMAGE, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceColumns: 2,
      sourceRows: 1,
      outputColumns: 5,
      outputRows: 2,
    });
    expect(diagnostics.some((item) => item.code === 'frame-count-mismatch')).toBe(
      true,
    );
  });

  it('errors when margins consume the whole source image', () => {
    const diagnostics = validateSpriteSheetSettings(IMAGE, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      sourceMarginX: 300,
    });
    expect(diagnostics.some((item) => item.code === 'invalid-source-grid')).toBe(
      true,
    );
  });
});
