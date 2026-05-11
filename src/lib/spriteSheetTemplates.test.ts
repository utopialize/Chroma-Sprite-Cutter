import { describe, expect, it } from 'vitest';
import { SPRITESHEET_TEMPLATES } from './spriteSheetTemplates';

describe('SPRITESHEET_TEMPLATES', () => {
  it('contains recommended common formats', () => {
    expect(
      SPRITESHEET_TEMPLATES.some(
        (template) =>
          template.settings.outputColumns === 5 &&
          template.settings.outputRows === 2 &&
          template.settings.frameWidth === 128 &&
          template.settings.frameHeight === 128,
      ),
    ).toBe(true);

    expect(
      SPRITESHEET_TEMPLATES.some(
        (template) =>
          template.settings.outputColumns === 8 &&
          template.settings.outputRows === 1 &&
          template.settings.frameWidth === 64 &&
          template.settings.frameHeight === 64,
      ),
    ).toBe(true);
  });
});
