export const METADATA_PRESETS = [
  'generic',
  'aseprite',
  'phaser',
  'godot',
  'unity',
] as const;

export type MetadataPreset = (typeof METADATA_PRESETS)[number];

export interface ExportOptions {
  fileBaseName: string;
  metadataPreset: MetadataPreset;
}

export type ExportOptionsInput = Partial<ExportOptions>;

export interface ZipContentSummaryItem {
  name: string;
  detail: string;
}
