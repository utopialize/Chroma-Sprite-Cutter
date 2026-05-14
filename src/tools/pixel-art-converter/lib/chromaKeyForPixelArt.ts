import { applyChromaKey } from '../../../lib/chromaKey';
import type { RGB } from '../types';

export interface PixelArtChromaKeySettings {
  enabled: boolean;
  color: RGB;
  tolerance: number;
  softness: number;
  spillSuppression: number;
  protectEdges: boolean;
}

export const DEFAULT_CHROMA_KEY: PixelArtChromaKeySettings = {
  enabled: false,
  color: { r: 0, g: 255, b: 0 },
  tolerance: 30,
  softness: 25,
  spillSuppression: 50,
  protectEdges: true,
};

const CLEANUP_WHEN_UNPROTECTED = 35;

export function applyChromaKeyForPixelArt(
  imageData: ImageData,
  settings: PixelArtChromaKeySettings,
): ImageData {
  return applyChromaKey(imageData, {
    keyColor: settings.color,
    tolerance: settings.tolerance,
    softness: settings.softness,
    spillSuppression: settings.spillSuppression,
    edgeCleanup: settings.protectEdges ? 0 : CLEANUP_WHEN_UNPROTECTED,
    preserveDetails: 50,
  });
}
