import { applyChromaKey } from './chromaKey';
import { GifEncoder } from './gifEncoder';
import { buildPlaybackSequence, selectAnimationRange } from './animation';
import { buildSpriteSheet } from './spriteSheet';
import { createZip } from './zip';
import type { ChromaKeySettings, LoadedImage } from '../types/image';
import type {
  SpriteSheetBuildResult,
  SpriteSheetSettings,
} from '../types/spriteSheet';

export async function exportTransparentPng(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings?: SpriteSheetSettings,
): Promise<void> {
  const { output } = renderExportImage(image, settings, spriteSheetSettings);

  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot obtain 2D context');
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

export async function exportSpriteSheetMetadata(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
): Promise<void> {
  const { result, output } = renderExportImage(
    image,
    settings,
    spriteSheetSettings,
  );
  const metadata = result
    ? buildSpriteSheetMetadata(image, spriteSheetSettings, result)
    : buildTransparentImageMetadata(image, output);
  const blob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, buildMetadataExportName(image.name));
}

export async function exportIndividualFrames(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
): Promise<void> {
  if (!spriteSheetSettings.enabled) {
    throw new Error('Frame export requires Sprite Sheet Builder to be enabled');
  }
  const { result } = renderExportImage(image, settings, spriteSheetSettings);
  if (!result) throw new Error('Failed to build sprite sheet');

  const stem = getStem(image.name);
  const frames = await renderFramePngs(result, spriteSheetSettings);
  for (const frame of frames) {
    triggerDownload(frame.blob, `${stem}_${frame.name}.png`);
  }
}

export async function exportProjectZip(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
): Promise<void> {
  const { result, output } = renderExportImage(
    image,
    settings,
    spriteSheetSettings,
  );
  const stem = getStem(image.name);
  const entries: { path: string; data: Uint8Array }[] = [];

  const outputBlob = await imageDataToPngBlob(output);
  entries.push({
    path: result ? `${stem}_spritesheet.png` : `${stem}_transparent.png`,
    data: await blobToBytes(outputBlob),
  });

  const metadata = result
    ? buildSpriteSheetMetadata(image, spriteSheetSettings, result)
    : buildTransparentImageMetadata(image, output);
  entries.push({
    path: `${stem}_metadata.json`,
    data: new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
  });

  if (result) {
    const framePngs = await renderFramePngs(result, spriteSheetSettings);
    for (const frame of framePngs) {
      entries.push({
        path: `frames/${frame.name}.png`,
        data: await blobToBytes(frame.blob),
      });
    }

    if (canBuildAnimationGif(result, spriteSheetSettings)) {
      const gifBytes = buildAnimationGifBytes(result, spriteSheetSettings, {});
      entries.push({
        path: `${stem}_animation_${spriteSheetSettings.animationFps}fps.gif`,
        data: gifBytes,
      });
    }
  }

  const zipBytes = createZip(entries);
  triggerDownload(
    new Blob([zipBytes as BlobPart], { type: 'application/zip' }),
    buildZipExportName(image.name),
  );
}

export interface AnimationGifOptions {
  fps?: number;
  alphaThreshold?: number;
  loop?: number;
}

export async function exportAnimationGif(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
  options: AnimationGifOptions,
): Promise<void> {
  if (!spriteSheetSettings.enabled) {
    throw new Error('GIF export requires Sprite Sheet Builder to be enabled');
  }
  const { result } = renderExportImage(image, settings, spriteSheetSettings);
  if (!result) throw new Error('Failed to build sprite sheet');

  const bytes = buildAnimationGifBytes(result, spriteSheetSettings, options);
  const fps = Math.max(
    1,
    Math.min(60, Math.round(options.fps ?? spriteSheetSettings.animationFps)),
  );
  const blob = new Blob([bytes as BlobPart], { type: 'image/gif' });
  triggerDownload(blob, buildAnimationGifExportName(image.name, fps));
}

function buildAnimationGifBytes(
  result: SpriteSheetBuildResult,
  spriteSheetSettings: SpriteSheetSettings,
  options: AnimationGifOptions,
): Uint8Array {
  const animationFrames = buildPlaybackSequence(
    selectAnimationRange(
      result.frames.filter((frame) => frame.sourceIndex !== null),
      spriteSheetSettings.animationStartFrame,
      spriteSheetSettings.animationEndFrame,
    ),
    spriteSheetSettings.animationPingPong,
  );
  if (animationFrames.length === 0) {
    throw new Error('No frames available for animation');
  }

  const frameWidth = spriteSheetSettings.frameWidth;
  const frameHeight = spriteSheetSettings.frameHeight;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = result.width;
  sheetCanvas.height = result.height;
  const sheetCtx = sheetCanvas.getContext('2d');
  if (!sheetCtx) throw new Error('Cannot obtain 2D context');
  sheetCtx.putImageData(result.imageData, 0, 0);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = frameWidth;
  frameCanvas.height = frameHeight;
  const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
  if (!frameCtx) throw new Error('Cannot obtain 2D context');
  frameCtx.imageSmoothingEnabled = false;

  const fps = Math.max(
    1,
    Math.min(60, Math.round(options.fps ?? spriteSheetSettings.animationFps)),
  );
  const delayCs = Math.max(2, Math.round(100 / fps));
  const alphaThreshold = options.alphaThreshold ?? 128;
  const loop = options.loop ?? (spriteSheetSettings.animationLoop ? 0 : 1);

  const encoder = new GifEncoder(frameWidth, frameHeight, loop);
  for (const frame of animationFrames) {
    frameCtx.clearRect(0, 0, frameWidth, frameHeight);
    frameCtx.drawImage(
      sheetCanvas,
      frame.destinationCell.x,
      frame.destinationCell.y,
      frame.destinationCell.width,
      frame.destinationCell.height,
      0,
      0,
      frameWidth,
      frameHeight,
    );
    const data = frameCtx.getImageData(0, 0, frameWidth, frameHeight);
    encoder.addFrame({ imageData: data, delayCs, alphaThreshold });
  }

  return encoder.finalize();
}

export function canBuildAnimationGif(
  result: SpriteSheetBuildResult,
  spriteSheetSettings: SpriteSheetSettings,
): boolean {
  return (
    buildPlaybackSequence(
      selectAnimationRange(
        result.frames.filter((frame) => frame.sourceIndex !== null),
        spriteSheetSettings.animationStartFrame,
        spriteSheetSettings.animationEndFrame,
      ),
      spriteSheetSettings.animationPingPong,
    ).length > 0
  );
}

export function buildExportName(sourceName: string): string {
  const dot = sourceName.lastIndexOf('.');
  const stem = dot === -1 ? sourceName : sourceName.slice(0, dot);
  return `${stem}_transparent.png`;
}

export function buildAnimationGifExportName(
  sourceName: string,
  fps: number,
): string {
  return `${getStem(sourceName)}_animation_${fps}fps.gif`;
}

export function buildSpriteSheetExportName(
  sourceName: string,
  settings: SpriteSheetSettings,
): string {
  const stem = getStem(sourceName);
  return `${stem}_spritesheet_${settings.outputColumns}x${settings.outputRows}_${settings.frameWidth}x${settings.frameHeight}.png`;
}

export function buildMetadataExportName(sourceName: string): string {
  return `${getStem(sourceName)}_metadata.json`;
}

export function buildZipExportName(sourceName: string): string {
  return `${getStem(sourceName)}_export.zip`;
}

function renderExportImage(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings?: SpriteSheetSettings,
): {
  processed: ImageData;
  output: ImageData;
  result: SpriteSheetBuildResult | null;
} {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot obtain 2D context');

  ctx.drawImage(image.element, 0, 0);
  const source = ctx.getImageData(0, 0, image.width, image.height);
  const processed = applyChromaKey(source, settings);
  const result = spriteSheetSettings?.enabled
    ? buildSpriteSheet(processed, spriteSheetSettings)
    : null;

  return {
    processed,
    output: result?.imageData ?? processed,
    result,
  };
}

function buildTransparentImageMetadata(image: LoadedImage, output: ImageData) {
  return {
    version: 1,
    type: 'transparent-image',
    source: image.name,
    image: {
      width: output.width,
      height: output.height,
      format: 'png',
    },
  };
}

function buildSpriteSheetMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
) {
  return {
    version: 1,
    type: 'spritesheet',
    source: image.name,
    image: {
      width: result.width,
      height: result.height,
      format: 'png',
    },
    grid: {
      columns: settings.outputColumns,
      rows: settings.outputRows,
      frameWidth: settings.frameWidth,
      frameHeight: settings.frameHeight,
    },
    anchor: settings.anchor,
    fitMode: settings.fitMode,
    animations: [
      {
        name: settings.animationName,
        startFrame: settings.animationStartFrame,
        endFrame: settings.animationEndFrame,
        fps: settings.animationFps,
        loop: settings.animationLoop,
        pingPong: settings.animationPingPong,
        frames: selectAnimationRange(
          result.frames.filter((frame) => frame.sourceIndex !== null),
          settings.animationStartFrame,
          settings.animationEndFrame,
        ).map((frame) => frame.index),
      },
    ],
    frames: result.frames.map((frame) => ({
      index: frame.index,
      sourceIndex: frame.sourceIndex,
      name: `frame_${String(frame.index + 1).padStart(3, '0')}`,
      empty: frame.empty,
      frame: frame.destinationCell,
      source: frame.sourceRect,
      content: frame.contentRect,
      draw: frame.drawRect,
      pivot: getPivot(settings),
    })),
  };
}

function getPivot(settings: SpriteSheetSettings): { x: number; y: number } {
  switch (settings.anchor) {
    case 'top-center':
      return { x: 0.5, y: 0 };
    case 'bottom-center':
      return { x: 0.5, y: 1 };
    case 'center':
      return { x: 0.5, y: 0.5 };
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode PNG'));
    }, 'image/png');
  });
}

async function imageDataToPngBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot obtain 2D context');
  ctx.putImageData(imageData, 0, 0);
  return canvasToPngBlob(canvas);
}

async function renderFramePngs(
  result: SpriteSheetBuildResult,
  settings: SpriteSheetSettings,
): Promise<Array<{ name: string; blob: Blob }>> {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = result.width;
  sourceCanvas.height = result.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Cannot obtain 2D context');
  sourceCtx.putImageData(result.imageData, 0, 0);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = settings.frameWidth;
  frameCanvas.height = settings.frameHeight;
  const frameCtx = frameCanvas.getContext('2d');
  if (!frameCtx) throw new Error('Cannot obtain 2D context');

  const output: Array<{ name: string; blob: Blob }> = [];
  for (const frame of result.frames.filter((item) => item.sourceIndex !== null)) {
    frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
    frameCtx.drawImage(
      sourceCanvas,
      frame.destinationCell.x,
      frame.destinationCell.y,
      frame.destinationCell.width,
      frame.destinationCell.height,
      0,
      0,
      frameCanvas.width,
      frameCanvas.height,
    );
    const index = String(frame.index + 1).padStart(3, '0');
    output.push({
      name: `frame_${index}`,
      blob: await canvasToPngBlob(frameCanvas),
    });
  }
  return output;
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function getStem(sourceName: string): string {
  const dot = sourceName.lastIndexOf('.');
  return dot === -1 ? sourceName : sourceName.slice(0, dot);
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
