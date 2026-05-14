export interface PixelArtSourceImage {
  element: HTMLImageElement;
  name: string;
  width: number;
  height: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type PixelArtPaletteMode = 'auto' | 'preset';

export type PixelArtPalettePresetId =
  | 'game-boy-4'
  | 'pico-8-16'
  | 'nes-like-32'
  | 'grayscale-8';

export type PixelArtDitheringMode = 'none' | 'ordered' | 'floyd-steinberg';

export type PixelArtPreviewMode =
  | 'original'
  | 'pixel-art'
  | 'side-by-side'
  | 'split-view';

export type PixelArtPreviewBackground =
  | 'checkerboard'
  | 'black'
  | 'white'
  | 'gray'
  | 'green-chroma'
  | 'custom';

export const PIXEL_ART_PREVIEW_MODES: {
  value: PixelArtPreviewMode;
  label: string;
}[] = [
  { value: 'original', label: 'Original only' },
  { value: 'pixel-art', label: 'Pixel art only' },
  { value: 'side-by-side', label: 'Side by side' },
  { value: 'split-view', label: 'Split view' },
];
