import type {
  PixelArtDitheringMode,
  PixelArtPaletteMode,
  PixelArtPalettePresetId,
  PixelArtSourceImage,
  RGB,
} from '../types';
import {
  applyChromaKeyForPixelArt,
  type PixelArtChromaKeySettings,
} from './chromaKeyForPixelArt';
import {
  applyEdgeEnhancement,
  type EdgeEnhancementSettings,
} from './edgeEnhancement';
import { extractPalette, getPalettePreset } from './palettes';
import { mapToNearestPaletteColor } from './quantize';
import { createNearestNeighborCanvas } from './resize';

export interface PixelArtPipelineSettings {
  targetWidth: number;
  targetHeight: number;
  colorCount: number;
  paletteMode: PixelArtPaletteMode;
  palettePreset: PixelArtPalettePresetId;
  dithering: PixelArtDitheringMode;
  chromaKey: PixelArtChromaKeySettings;
  edgeEnhancement: EdgeEnhancementSettings;
}

export interface PixelArtPipelineResult {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  width: number;
  height: number;
  palette: RGB[];
  paletteName: string;
  chromaKeyedCanvas: HTMLCanvasElement | null;
}

export function runPixelArtPipeline(
  sourceImage: PixelArtSourceImage,
  settings: PixelArtPipelineSettings,
): PixelArtPipelineResult {
  const chromaKeyedCanvas = settings.chromaKey.enabled
    ? buildChromaKeyedSource(sourceImage, settings.chromaKey)
    : null;

  const renderSource: CanvasImageSource =
    chromaKeyedCanvas ?? sourceImage.element;

  // Chroma key must run before resize and palette extraction so removed
  // background pixels cannot become palette samples or resize neighbors.
  const canvas = createNearestNeighborCanvas(
    renderSource,
    settings.targetWidth,
    settings.targetHeight,
  );
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot obtain 2D context');
  }

  const resized = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const preset = getPalettePreset(settings.palettePreset);
  const palette =
    settings.paletteMode === 'preset'
      ? preset.colors
      : extractPalette(resized, settings.colorCount);
  const paletteName =
    settings.paletteMode === 'preset'
      ? preset.name
      : `Auto ${settings.colorCount} colors`;

  const enhanced = settings.edgeEnhancement.enabled
    ? applyEdgeEnhancement(resized, settings.edgeEnhancement)
    : resized;

  const finalData =
    palette.length > 0
      ? mapToNearestPaletteColor(enhanced, palette, settings.dithering)
      : enhanced;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(finalData, 0, 0);

  return {
    canvas,
    imageData: finalData,
    width: canvas.width,
    height: canvas.height,
    palette,
    paletteName,
    chromaKeyedCanvas,
  };
}

function buildChromaKeyedSource(
  sourceImage: PixelArtSourceImage,
  chromaKey: PixelArtChromaKeySettings,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Cannot obtain 2D context');
  }
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceImage.element, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const keyed = applyChromaKeyForPixelArt(data, chromaKey);
  ctx.putImageData(keyed, 0, 0);
  return canvas;
}
