import type { SpriteSheetSettings } from '../types/spriteSheet';

export interface SpriteSheetTemplate {
  id: string;
  label: string;
  description: string;
  settings: Pick<
    SpriteSheetSettings,
    | 'sourceColumns'
    | 'sourceRows'
    | 'outputColumns'
    | 'outputRows'
    | 'frameWidth'
    | 'frameHeight'
    | 'fitMode'
    | 'anchor'
    | 'padding'
  >;
}

export const SPRITESHEET_TEMPLATES: SpriteSheetTemplate[] = [
  {
    id: 'ai-character-5x2-128',
    label: '5 x 2 / 128',
    description: 'Common AI character sheet',
    settings: {
      sourceColumns: 5,
      sourceRows: 2,
      outputColumns: 5,
      outputRows: 2,
      frameWidth: 128,
      frameHeight: 128,
      fitMode: 'contain',
      anchor: 'bottom-center',
      padding: 0,
    },
  },
  {
    id: 'strip-8x1-64',
    label: '8 x 1 / 64',
    description: 'Horizontal animation strip',
    settings: {
      sourceColumns: 8,
      sourceRows: 1,
      outputColumns: 8,
      outputRows: 1,
      frameWidth: 64,
      frameHeight: 64,
      fitMode: 'contain',
      anchor: 'center',
      padding: 0,
    },
  },
  {
    id: 'large-4x4-256',
    label: '4 x 4 / 256',
    description: 'Large frames or VFX',
    settings: {
      sourceColumns: 4,
      sourceRows: 4,
      outputColumns: 4,
      outputRows: 4,
      frameWidth: 256,
      frameHeight: 256,
      fitMode: 'contain',
      anchor: 'center',
      padding: 0,
    },
  },
  {
    id: 'rpg-walk-3x4-128',
    label: 'RPG walk',
    description: 'Four directions, three frames',
    settings: {
      sourceColumns: 3,
      sourceRows: 4,
      outputColumns: 3,
      outputRows: 4,
      frameWidth: 128,
      frameHeight: 128,
      fitMode: 'contain',
      anchor: 'bottom-center',
      padding: 0,
    },
  },
];
