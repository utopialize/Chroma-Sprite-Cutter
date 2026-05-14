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
  applyDarkEdgeOutline,
  type DarkEdgeOutlineSettings,
} from './darkEdgeOutline';
import {
  applyEdgeEnhancement,
  type EdgeEnhancementSettings,
} from './edgeEnhancement';
import { extractPalette, getPalettePreset, isVisiblePixel } from './palettes';
import {
  applyPixelCleanup,
  type PixelCleanupSettings,
} from './pixelCleanup';
import { mapToNearestPaletteColor } from './quantize';
import { createNearestNeighborCanvas } from './resize';

export interface PixelArtPipelineSettings {
  targetWidth: number;
  targetHeight: number;
  colorCount: number;
  paletteMode: PixelArtPaletteMode;
  palettePreset: PixelArtPalettePresetId;
  dithering: PixelArtDitheringMode;
  trimSubjectEnabled: boolean;
  subjectPaddingPx: number;
  pixelCleanup: PixelCleanupSettings;
  darkEdge: DarkEdgeOutlineSettings;
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
  const canvas = settings.trimSubjectEnabled
    ? createTrimmedSubjectCanvas(
        renderSource,
        sourceImage.width,
        sourceImage.height,
        settings.targetWidth,
        settings.targetHeight,
        settings.subjectPaddingPx,
      )
    : createNearestNeighborCanvas(
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

  const quantized =
    palette.length > 0
      ? mapToNearestPaletteColor(enhanced, palette, settings.dithering)
      : enhanced;
  const cleaned = applyPixelCleanup(quantized, settings.pixelCleanup);
  const finalData = applyDarkEdgeOutline(cleaned, {
    ...settings.darkEdge,
    palette,
  });

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

interface VisibleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createTrimmedSubjectCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  paddingPx: number,
): HTMLCanvasElement {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceCtx = sourceCanvas.getContext('2d', {
    willReadFrequently: true,
  });
  if (!sourceCtx) {
    throw new Error('Cannot obtain 2D context');
  }
  sourceCtx.imageSmoothingEnabled = false;
  sourceCtx.clearRect(0, 0, sourceWidth, sourceHeight);
  sourceCtx.drawImage(source, 0, 0);

  const sourceData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
  const bounds = findVisibleBounds(sourceData);
  if (!bounds) {
    return createNearestNeighborCanvas(source, targetWidth, targetHeight);
  }

  const padding = Math.max(0, Math.round(paddingPx));
  const cropWidth = Math.max(1, bounds.width + padding * 2);
  const cropHeight = Math.max(1, bounds.height + padding * 2);
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) {
    throw new Error('Cannot obtain 2D context');
  }
  cropCtx.imageSmoothingEnabled = false;
  cropCtx.clearRect(0, 0, cropWidth, cropHeight);
  cropCtx.drawImage(
    sourceCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    padding,
    padding,
    bounds.width,
    bounds.height,
  );

  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(targetWidth));
  output.height = Math.max(1, Math.round(targetHeight));
  const outputCtx = output.getContext('2d');
  if (!outputCtx) {
    throw new Error('Cannot obtain 2D context');
  }
  outputCtx.imageSmoothingEnabled = false;
  outputCtx.clearRect(0, 0, output.width, output.height);

  const scale = Math.min(output.width / cropWidth, output.height / cropHeight);
  const drawWidth = Math.max(1, Math.round(cropWidth * scale));
  const drawHeight = Math.max(1, Math.round(cropHeight * scale));
  const dx = Math.floor((output.width - drawWidth) / 2);
  const dy = Math.floor((output.height - drawHeight) / 2);
  outputCtx.drawImage(cropCanvas, dx, dy, drawWidth, drawHeight);
  return output;
}

function findVisibleBounds(imageData: ImageData): VisibleBounds | null {
  const data = imageData.data;
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const alpha = data[(y * imageData.width + x) * 4 + 3];
      if (!isVisiblePixel(alpha)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
