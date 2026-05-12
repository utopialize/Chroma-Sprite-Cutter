export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const APP_VERSION = '0.1.1';

export const REPO_URL = 'https://github.com/utopialize/Chroma-Sprite-Cutter';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.1',
    date: '2026-05-12',
    highlights: [
      'Build step now has Simple and Advanced modes so the common source-grid workflow stays focused by default.',
      'Advanced mode contains extraction mode, frame inclusion, manual corrections, source spacing, advanced output options, and animation clips.',
      'Manual frame corrections now open in an editor drawer so the Frames tab stays focused on selection and preview.',
      'Manual corrections support multi-selection for batch offsets, locks, deletion, duplication, and per-frame auto-centering.',
      'Builder auto-centering tools recenter detected content inside each unlocked frame on X, Y, or both axes.',
      'Multiple named animation clips, animation preview overlays, transparent GIF export, and ZIP package export.',
      'Export step supports output base names, metadata presets, individual frames, and visible ZIP content summaries.',
      'Changelog policy changed to keep one application version per work day instead of incrementing for every small development batch.',
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
