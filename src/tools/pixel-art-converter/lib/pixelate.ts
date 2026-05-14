import type {
  PixelArtDarkEdgeColorMode,
  PixelArtDarkEdgeMode,
  PixelArtDitheringMode,
  PixelArtPreviewBackground,
  PixelArtPreviewMode,
  PixelArtPaletteMode,
  PixelArtPalettePresetId,
  PixelArtSourceImage,
  RGB,
} from '../types';
import {
  DEFAULT_CHROMA_KEY,
} from './chromaKeyForPixelArt';
import {
  DEFAULT_EDGE_ENHANCEMENT,
  type EdgeEnhancementMode,
} from './edgeEnhancement';
import {
  runPixelArtPipeline,
  type PixelArtPipelineResult,
} from './imagePipeline';

export interface PixelArtSettings {
  targetWidth: number;
  targetHeight: number;
  lockAspectRatio: boolean;
  previewFitMode: 'match-source';
  trimSubjectEnabled: boolean;
  subjectPaddingPx: number;
  paletteMode: PixelArtPaletteMode;
  palettePreset: PixelArtPalettePresetId;
  colorCount: number;
  dithering: PixelArtDitheringMode;
  pixelCleanupEnabled: boolean;
  pixelCleanupStrength: number;
  darkEdgeEnabled: boolean;
  darkEdgeStrength: number;
  darkEdgeMode: PixelArtDarkEdgeMode;
  darkEdgeColorMode: PixelArtDarkEdgeColorMode;
  darkEdgeRespectPalette: boolean;
  edgeEnhancementEnabled: boolean;
  edgeEnhancementStrength: number;
  edgeEnhancementMode: EdgeEnhancementMode;
  protectAlphaEdges: boolean;
  chromaKeyEnabled: boolean;
  chromaKeyColor: RGB;
  chromaKeyTolerance: number;
  chromaKeySoftness: number;
  chromaKeySpillSuppression: number;
  chromaKeyProtectEdges: boolean;
  previewMode: PixelArtPreviewMode;
  previewBackground: PixelArtPreviewBackground;
  previewBackgroundColor: string;
  exportScale: number;
}

export const SIZE_PRESETS = [16, 32, 64, 96, 128, 256] as const;

export const EXPORT_SCALES = [1, 2, 4, 8] as const;

export const MIN_DIMENSION = 1;
export const MAX_DIMENSION = 1024;

export const DEFAULT_PIXEL_ART_SETTINGS: PixelArtSettings = {
  targetWidth: 64,
  targetHeight: 64,
  lockAspectRatio: true,
  previewFitMode: 'match-source',
  trimSubjectEnabled: false,
  subjectPaddingPx: 0,
  paletteMode: 'auto',
  palettePreset: 'pico-8-16',
  colorCount: 16,
  dithering: 'none',
  pixelCleanupEnabled: true,
  pixelCleanupStrength: 0.35,
  darkEdgeEnabled: false,
  darkEdgeStrength: 0.25,
  darkEdgeMode: 'external',
  darkEdgeColorMode: 'adaptive',
  darkEdgeRespectPalette: true,
  edgeEnhancementEnabled: DEFAULT_EDGE_ENHANCEMENT.enabled,
  edgeEnhancementStrength: DEFAULT_EDGE_ENHANCEMENT.strength,
  edgeEnhancementMode: DEFAULT_EDGE_ENHANCEMENT.mode,
  protectAlphaEdges: DEFAULT_EDGE_ENHANCEMENT.protectAlphaEdges,
  chromaKeyEnabled: DEFAULT_CHROMA_KEY.enabled,
  chromaKeyColor: DEFAULT_CHROMA_KEY.color,
  chromaKeyTolerance: DEFAULT_CHROMA_KEY.tolerance,
  chromaKeySoftness: DEFAULT_CHROMA_KEY.softness,
  chromaKeySpillSuppression: DEFAULT_CHROMA_KEY.spillSuppression,
  chromaKeyProtectEdges: DEFAULT_CHROMA_KEY.protectEdges,
  previewMode: 'side-by-side',
  previewBackground: 'checkerboard',
  previewBackgroundColor: '#00ff00',
  exportScale: 1,
};

export type PixelArtResult = PixelArtPipelineResult;

export function createPixelArtImage(
  sourceImage: PixelArtSourceImage,
  settings: PixelArtSettings,
): PixelArtResult {
  return runPixelArtPipeline(sourceImage, {
    targetWidth: clampDimension(settings.targetWidth),
    targetHeight: clampDimension(settings.targetHeight),
    colorCount: settings.colorCount,
    paletteMode: settings.paletteMode,
    palettePreset: settings.palettePreset,
    dithering: settings.dithering,
    trimSubjectEnabled: settings.trimSubjectEnabled,
    subjectPaddingPx: clampPadding(settings.subjectPaddingPx),
    pixelCleanup: {
      enabled: settings.pixelCleanupEnabled,
      strength: clamp01(settings.pixelCleanupStrength),
    },
    darkEdge: {
      enabled: settings.darkEdgeEnabled,
      strength: clamp01(settings.darkEdgeStrength),
      mode: settings.darkEdgeMode,
      colorMode: settings.darkEdgeColorMode,
      respectPalette: settings.darkEdgeRespectPalette,
    },
    chromaKey: {
      enabled: settings.chromaKeyEnabled,
      color: settings.chromaKeyColor,
      tolerance: settings.chromaKeyTolerance,
      softness: settings.chromaKeySoftness,
      spillSuppression: settings.chromaKeySpillSuppression,
      protectEdges: settings.chromaKeyProtectEdges,
    },
    edgeEnhancement: {
      enabled: settings.edgeEnhancementEnabled,
      strength: settings.edgeEnhancementStrength,
      mode: settings.edgeEnhancementMode,
      protectAlphaEdges: settings.protectAlphaEdges,
    },
  });
}

function clampPadding(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 512) return 512;
  return rounded;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function clampDimension(value: number): number {
  if (!Number.isFinite(value)) return MIN_DIMENSION;
  const rounded = Math.round(value);
  if (rounded < MIN_DIMENSION) return MIN_DIMENSION;
  if (rounded > MAX_DIMENSION) return MAX_DIMENSION;
  return rounded;
}

export function deriveLockedHeight(
  width: number,
  source: PixelArtSourceImage,
): number {
  if (source.width <= 0) return clampDimension(width);
  return clampDimension((width * source.height) / source.width);
}

export function deriveLockedWidth(
  height: number,
  source: PixelArtSourceImage,
): number {
  if (source.height <= 0) return clampDimension(height);
  return clampDimension((height * source.width) / source.height);
}
