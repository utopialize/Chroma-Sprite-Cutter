export type PreviewBackground =
  | 'checker'
  | 'white'
  | 'black'
  | 'gray'
  | 'red'
  | 'blue';

export type Zoom = 'fit' | number;

export type ViewMode = 'processed' | 'original' | 'split' | 'alpha';

export type SpriteSheetPreviewMode =
  | 'sheet-source'
  | 'sheet-extracted'
  | 'sheet-final';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LoadedImage {
  element: HTMLImageElement;
  width: number;
  height: number;
  name: string;
  size?: number;
  type?: string;
}

export interface ChromaKeySettings {
  keyColor: RGB;
  tolerance: number;
  softness: number;
  spillSuppression: number;
  edgeCleanup: number;
  preserveDetails: number;
}
