import type { Zoom } from '../types/image';

export const ZOOM_LEVELS = [0.25, 0.5, 1, 2, 4, 8, 16] as const;

export function stepZoom(current: Zoom, direction: 1 | -1): Zoom {
  const value = typeof current === 'number' ? current : 1;
  if (direction === 1) {
    return ZOOM_LEVELS.find((z) => z > value) ?? value;
  }
  return [...ZOOM_LEVELS].reverse().find((z) => z < value) ?? value;
}

export function formatZoom(zoom: Zoom): string {
  return zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`;
}

export function effectiveZoom(
  zoom: Zoom,
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): number {
  if (zoom !== 'fit') return zoom;
  if (imageWidth <= 0 || imageHeight <= 0) return 1;
  return Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight,
    1,
  );
}
