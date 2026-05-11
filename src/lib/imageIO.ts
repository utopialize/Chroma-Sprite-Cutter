import { applyChromaKey } from './chromaKey';
import { buildSpriteSheet } from './spriteSheet';
import type { ChromaKeySettings, LoadedImage } from '../types/image';
import type { SpriteSheetSettings } from '../types/spriteSheet';

export async function exportTransparentPng(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings?: SpriteSheetSettings,
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot obtain 2D context');

  ctx.drawImage(image.element, 0, 0);
  const source = ctx.getImageData(0, 0, image.width, image.height);
  const processed = applyChromaKey(source, settings);
  const output =
    spriteSheetSettings?.enabled
      ? buildSpriteSheet(processed, spriteSheetSettings).imageData
      : processed;

  canvas.width = output.width;
  canvas.height = output.height;
  ctx.clearRect(0, 0, output.width, output.height);
  ctx.putImageData(output, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (!blob) throw new Error('Failed to encode PNG');

  triggerDownload(
    blob,
    spriteSheetSettings?.enabled
      ? buildSpriteSheetExportName(image.name, spriteSheetSettings)
      : buildExportName(image.name),
  );
}

export function buildExportName(sourceName: string): string {
  const dot = sourceName.lastIndexOf('.');
  const stem = dot === -1 ? sourceName : sourceName.slice(0, dot);
  return `${stem}_transparent.png`;
}

export function buildSpriteSheetExportName(
  sourceName: string,
  settings: SpriteSheetSettings,
): string {
  const dot = sourceName.lastIndexOf('.');
  const stem = dot === -1 ? sourceName : sourceName.slice(0, dot);
  return `${stem}_spritesheet_${settings.outputColumns}x${settings.outputRows}_${settings.frameWidth}x${settings.frameHeight}.png`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
