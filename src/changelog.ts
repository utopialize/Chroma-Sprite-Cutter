export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const APP_VERSION = '0.8.0';

export const REPO_URL = 'https://github.com/utopialize/Chroma-Sprite-Cutter';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.8.0',
    date: '2026-05-12',
    highlights: [
      'ZIP package export containing the final PNG, metadata JSON, individual frame PNGs, and animation GIF.',
      'Dependency-free ZIP writer for packaging already-compressed game asset files.',
      'Frame export internals are shared between individual downloads and ZIP packaging.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-05-12',
    highlights: [
      'Persistent animation settings in the Build step: name, frame range, FPS, loop, and ping-pong.',
      'Animation preview, GIF export, metadata, and project presets now use the same animation configuration.',
      'Diagnostics warn when animation ranges exceed the included frame selection.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-05-12',
    highlights: [
      'Animated GIF export with transparency from the rebuilt sprite sheet, with configurable FPS.',
      'Frame selection grid now renders an actual preview of each source frame instead of a numbered button.',
      'Self-contained GIF89a encoder with median-cut quantization and LZW compression - no external dependency.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-05-12',
    highlights: [
      'Source frame inclusion/exclusion before the sheet is reassembled.',
      'Sprite sheet diagnostics: invalid grids, frame count mismatches, empty frames, clipping risk, padding warnings.',
      'README refresh covering the four-step workflow.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-05-12',
    highlights: [
      'Animation preview panel with play/pause, FPS slider, prev/next stepping, and ping-pong mode.',
      'Animation helpers shared between preview and export.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-05-12',
    highlights: [
      'Alpha mask view mode in the Clean Background step for debugging edges.',
      'Built-in sprite sheet templates: 5 x 2 / 128, 8 x 1 / 64, 4 x 4 / 256, and RPG walk.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-12',
    highlights: [
      'Sprite Sheet Builder validation and diagnostics surfaced in the workspace.',
      'Individual frame export and JSON metadata export.',
      'Project preset management combining chroma key and sheet settings.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-05-11',
    highlights: [
      'Initial release with drag-and-drop PNG import and the four-step workflow.',
      'YCbCr chroma key in a web worker, eyedropper, auto-detect, configurable preview backgrounds.',
      'Mask presets and unit tests across the core algorithms.',
    ],
  },
];
