export type SpriteSheetExtractionMode = 'source-grid';

export type SpriteSheetFitMode = 'contain' | 'cover' | 'original';

export type SpriteSheetAnchor = 'center' | 'bottom-center' | 'top-center';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteSheetSettings {
  enabled: boolean;
  extractionMode: SpriteSheetExtractionMode;
  sourceColumns: number;
  sourceRows: number;
  sourceMarginX: number;
  sourceMarginY: number;
  sourceGapX: number;
  sourceGapY: number;
  outputColumns: number;
  outputRows: number;
  frameWidth: number;
  frameHeight: number;
  fitMode: SpriteSheetFitMode;
  anchor: SpriteSheetAnchor;
  padding: number;
  alphaThreshold: number;
}

export interface SpriteSheetFrame {
  index: number;
  sourceRect: Rect;
  contentRect: Rect | null;
  destinationCell: Rect;
  drawRect: Rect | null;
  empty: boolean;
}

export interface SpriteSheetBuildResult {
  imageData: ImageData;
  frames: SpriteSheetFrame[];
  width: number;
  height: number;
}
