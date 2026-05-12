import { applyChromaKey } from './chromaKey';
import { GifEncoder } from './gifEncoder';
import { buildPlaybackSequence, selectAnimationRange } from './animation';
import { getEffectiveManualFrames } from './manualFrames';
import { buildSpriteSheet } from './spriteSheet';
import { createZip } from './zip';
import type {
  ExportOptionsInput,
  MetadataPreset,
  ZipContentSummaryItem,
} from '../types/export';
import type { ChromaKeySettings, LoadedImage } from '../types/image';
import type {
  SpriteSheetBuildResult,
  SpriteSheetSettings,
} from '../types/spriteSheet';

export async function exportTransparentPng(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings?: SpriteSheetSettings,
  options: ExportOptionsInput = {},
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
      ? buildSpriteSheetExportName(image.name, spriteSheetSettings, options)
      : buildExportName(image.name, options),
  );
}

export async function exportSpriteSheetMetadata(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
  options: ExportOptionsInput = {},
): Promise<void> {
  const { result, output } = renderExportImage(
    image,
    settings,
    spriteSheetSettings,
  );
  const metadata = result
    ? buildSpriteSheetMetadata(image, spriteSheetSettings, result, options)
    : buildTransparentImageMetadata(image, output, options);
  const blob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, buildMetadataExportName(image.name, options));
}

export async function exportIndividualFrames(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
  options: ExportOptionsInput = {},
): Promise<void> {
  if (!spriteSheetSettings.enabled) {
    throw new Error('Frame export requires Sprite Sheet Builder to be enabled');
  }
  const { result } = renderExportImage(image, settings, spriteSheetSettings);
  if (!result) throw new Error('Failed to build sprite sheet');

  const stem = getExportStem(image.name, options);
  const frames = await renderFramePngs(result, spriteSheetSettings);
  for (const frame of frames) {
    triggerDownload(frame.blob, `${stem}_${frame.name}.png`);
  }
}

export async function exportProjectZip(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
  options: ExportOptionsInput = {},
): Promise<void> {
  const { result, output } = renderExportImage(
    image,
    settings,
    spriteSheetSettings,
  );
  const entries: { path: string; data: Uint8Array }[] = [];

  const outputBlob = await imageDataToPngBlob(output);
  entries.push({
    path: result
      ? buildSpriteSheetExportName(image.name, spriteSheetSettings, options)
      : buildExportName(image.name, options),
    data: await blobToBytes(outputBlob),
  });

  const metadata = result
    ? buildSpriteSheetMetadata(image, spriteSheetSettings, result, options)
    : buildTransparentImageMetadata(image, output, options);
  entries.push({
    path: buildMetadataExportName(image.name, options),
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
        path: buildAnimationGifExportName(
          image.name,
          spriteSheetSettings.animationFps,
          options,
        ),
        data: gifBytes,
      });
    }
  }

  const zipBytes = createZip(entries);
  triggerDownload(
    new Blob([zipBytes as BlobPart], { type: 'application/zip' }),
    buildZipExportName(image.name, options),
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
  exportOptions: ExportOptionsInput = {},
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
  triggerDownload(
    blob,
    buildAnimationGifExportName(image.name, fps, exportOptions),
  );
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

export function buildExportName(
  sourceName: string,
  options: ExportOptionsInput = {},
): string {
  return `${getExportStem(sourceName, options)}_transparent.png`;
}

export function buildAnimationGifExportName(
  sourceName: string,
  fps: number,
  options: ExportOptionsInput = {},
): string {
  return `${getExportStem(sourceName, options)}_animation_${fps}fps.gif`;
}

export function buildSpriteSheetExportName(
  sourceName: string,
  settings: SpriteSheetSettings,
  options: ExportOptionsInput = {},
): string {
  const stem = getExportStem(sourceName, options);
  return `${stem}_spritesheet_${settings.outputColumns}x${settings.outputRows}_${settings.frameWidth}x${settings.frameHeight}.png`;
}

export function buildMetadataExportName(
  sourceName: string,
  options: ExportOptionsInput = {},
): string {
  return `${getExportStem(sourceName, options)}_metadata.json`;
}

export function buildZipExportName(
  sourceName: string,
  options: ExportOptionsInput = {},
): string {
  return `${getExportStem(sourceName, options)}_export.zip`;
}

export function buildZipContentSummary(
  sourceName: string,
  settings: SpriteSheetSettings,
  options: ExportOptionsInput = {},
): ZipContentSummaryItem[] {
  const entries: ZipContentSummaryItem[] = [
    {
      name: settings.enabled
        ? buildSpriteSheetExportName(sourceName, settings, options)
        : buildExportName(sourceName, options),
      detail: settings.enabled
        ? `${settings.outputColumns} x ${settings.outputRows} sheet, ${settings.frameWidth} x ${settings.frameHeight} px frames`
        : 'Processed transparent PNG',
    },
    {
      name: buildMetadataExportName(sourceName, options),
      detail: `${getMetadataPresetLabel(resolveMetadataPreset(options))} metadata`,
    },
  ];

  if (settings.enabled) {
    const included = getEffectiveManualFrames(settings).length;
    entries.push({
      name: 'frames/frame_###.png',
      detail: `Up to ${included} individual frame PNG${included === 1 ? '' : 's'}`,
    });
    entries.push({
      name: buildAnimationGifExportName(
        sourceName,
        settings.animationFps,
        options,
      ),
      detail: 'Included when the selected animation range contains frames',
    });
  }

  return entries;
}

export function sanitizeFileBaseName(value: string): string {
  const stem = getStem(value.trim());
  return (
    stem
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'sprite'
  );
}

export function getMetadataPresetLabel(preset: MetadataPreset): string {
  switch (preset) {
    case 'generic':
      return 'Generic';
    case 'aseprite':
      return 'Aseprite-like';
    case 'phaser':
      return 'Phaser atlas';
    case 'godot':
      return 'Godot';
    case 'unity':
      return 'Unity';
  }
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

function buildTransparentImageMetadata(
  image: LoadedImage,
  output: ImageData,
  options: ExportOptionsInput = {},
) {
  return {
    version: 1,
    type: 'transparent-image',
    preset: resolveMetadataPreset(options),
    source: image.name,
    file: buildExportName(image.name, options),
    image: {
      width: output.width,
      height: output.height,
      format: 'png',
    },
  };
}

export function buildSpriteSheetMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
  options: ExportOptionsInput = {},
) {
  const preset = resolveMetadataPreset(options);
  if (preset === 'aseprite') {
    return buildAsepriteMetadata(image, settings, result, options);
  }
  if (preset === 'phaser') {
    return buildPhaserMetadata(image, settings, result, options);
  }
  if (preset === 'godot') {
    return buildGodotMetadata(image, settings, result, options);
  }
  if (preset === 'unity') {
    return buildUnityMetadata(image, settings, result, options);
  }
  return buildGenericSpriteSheetMetadata(image, settings, result, options);
}

function buildGenericSpriteSheetMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
  options: ExportOptionsInput,
) {
  return {
    version: 1,
    type: 'spritesheet',
    preset: 'generic',
    source: image.name,
    file: buildSpriteSheetExportName(image.name, settings, options),
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
      name: frame.name,
      empty: frame.empty,
      offset: { x: frame.offsetX, y: frame.offsetY },
      locked: frame.locked,
      frame: frame.destinationCell,
      source: frame.sourceRect,
      content: frame.contentRect,
      draw: frame.drawRect,
      pivot: getPivot(settings),
    })),
  };
}

function buildAsepriteMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
  options: ExportOptionsInput,
) {
  const frames = Object.fromEntries(
    result.frames.map((frame) => {
      const name = `${frame.name}.png`;
      return [
        name,
        {
          frame: toAsepriteRect(frame.destinationCell),
          rotated: false,
          trimmed: frame.drawRect !== null,
          spriteSourceSize: toAsepriteRect(frame.drawRect ?? emptyRect()),
          sourceSize: { w: settings.frameWidth, h: settings.frameHeight },
          duration: Math.round(1000 / settings.animationFps),
        },
      ];
    }),
  );
  const selected = selectAnimationRange(
    result.frames.filter((frame) => frame.sourceIndex !== null),
    settings.animationStartFrame,
    settings.animationEndFrame,
  );
  return {
    frames,
    meta: {
      app: 'Chroma Sprite Cutter',
      version: '1.0',
      image: buildSpriteSheetExportName(image.name, settings, options),
      format: 'RGBA8888',
      size: { w: result.width, h: result.height },
      scale: '1',
      frameTags: [
        {
          name: settings.animationName,
          from: selected[0]?.index ?? 0,
          to: selected[selected.length - 1]?.index ?? 0,
          direction: settings.animationPingPong ? 'pingpong' : 'forward',
        },
      ],
    },
  };
}

function buildPhaserMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
  options: ExportOptionsInput,
) {
  return {
    textures: [
      {
        image: buildSpriteSheetExportName(image.name, settings, options),
        format: 'RGBA8888',
        size: { w: result.width, h: result.height },
        scale: 1,
        frames: result.frames.map((frame) => ({
          filename: `${frame.name}.png`,
          frame: toPhaserRect(frame.destinationCell),
          rotated: false,
          trimmed: false,
          spriteSourceSize: {
            x: 0,
            y: 0,
            w: settings.frameWidth,
            h: settings.frameHeight,
          },
          sourceSize: { w: settings.frameWidth, h: settings.frameHeight },
          pivot: getPivot(settings),
        })),
      },
    ],
    animations: [buildAnimationMetadata(settings, result)],
  };
}

function buildGodotMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
  options: ExportOptionsInput,
) {
  return {
    type: 'godot-spritesheet',
    texture: buildSpriteSheetExportName(image.name, settings, options),
    size: { width: result.width, height: result.height },
    hframes: settings.outputColumns,
    vframes: settings.outputRows,
    frameSize: { width: settings.frameWidth, height: settings.frameHeight },
    pivot: getPivot(settings),
    frames: result.frames.map((frame) => ({
      name: frame.name,
      index: frame.index,
      region: frame.destinationCell,
      empty: frame.empty,
    })),
    animations: [buildAnimationMetadata(settings, result)],
  };
}

function buildUnityMetadata(
  image: LoadedImage,
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
  options: ExportOptionsInput,
) {
  return {
    type: 'unity-spritesheet',
    texture: buildSpriteSheetExportName(image.name, settings, options),
    textureSize: { width: result.width, height: result.height },
    spriteMode: 'Multiple',
    pixelsPerUnit: settings.frameHeight,
    sprites: result.frames.map((frame) => ({
      name: frame.name,
      rect: frame.destinationCell,
      pivot: getPivot(settings),
      alignment: 'Custom',
      border: { left: 0, right: 0, top: 0, bottom: 0 },
    })),
    animations: [buildAnimationMetadata(settings, result)],
  };
}

function buildAnimationMetadata(
  settings: SpriteSheetSettings,
  result: SpriteSheetBuildResult,
) {
  return {
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
  };
}

function resolveMetadataPreset(options: ExportOptionsInput): MetadataPreset {
  return options.metadataPreset ?? 'generic';
}

function getExportStem(
  sourceName: string,
  options: ExportOptionsInput = {},
): string {
  return options.fileBaseName
    ? sanitizeFileBaseName(options.fileBaseName)
    : sanitizeFileBaseName(sourceName);
}

function emptyRect(): { x: number; y: number; width: number; height: number } {
  return { x: 0, y: 0, width: 0, height: 0 };
}

function toAsepriteRect(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
}

function toPhaserRect(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
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
      name: frame.name || `frame_${index}`,
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
