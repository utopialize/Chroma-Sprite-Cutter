import type {
  Rect,
  SpriteSheetBuildResult,
  SpriteSheetFrame,
  SpriteSheetManualFrame,
  SpriteSheetSettings,
  SpriteSheetSourceFrame,
} from '../types/spriteSheet';
import { getEffectiveManualFrames } from './manualFrames';

export const DEFAULT_SPRITESHEET_SETTINGS: SpriteSheetSettings = {
  enabled: false,
  extractionMode: 'source-grid',
  sourceColumns: 5,
  sourceRows: 2,
  sourceMarginX: 0,
  sourceMarginY: 0,
  sourceGapX: 0,
  sourceGapY: 0,
  outputColumns: 5,
  outputRows: 2,
  frameWidth: 128,
  frameHeight: 128,
  fitMode: 'contain',
  anchor: 'bottom-center',
  padding: 0,
  alphaThreshold: 8,
  excludedSourceFrameIndices: [],
  animationName: 'default',
  animationStartFrame: 1,
  animationEndFrame: 10,
  animationFps: 8,
  animationLoop: true,
  animationPingPong: false,
  animations: [
    {
      id: 'default-animation',
      name: 'default',
      startFrame: 1,
      endFrame: 10,
      fps: 8,
      loop: true,
      pingPong: false,
    },
  ],
  activeAnimationId: 'default-animation',
  manualFrames: [],
};

export function buildSpriteSheet(
  source: ImageData,
  settings: SpriteSheetSettings,
): SpriteSheetBuildResult {
  const sourceFrames = buildSourceFramePlan(source, settings);
  const frames = buildFramePlanFromSourceFrames(sourceFrames, settings);
  const width = getOutputWidth(settings);
  const height = getOutputHeight(settings);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Cannot obtain 2D context');

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = source.width;
  sourceCanvas.height = source.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Cannot obtain 2D context');
  sourceCtx.putImageData(source, 0, 0);

  for (const frame of frames) {
    if (!frame.contentRect || !frame.drawRect) continue;
    outputCtx.save();
    outputCtx.beginPath();
    outputCtx.rect(
      frame.destinationCell.x,
      frame.destinationCell.y,
      frame.destinationCell.width,
      frame.destinationCell.height,
    );
    outputCtx.clip();
    outputCtx.drawImage(
      sourceCanvas,
      frame.contentRect.x,
      frame.contentRect.y,
      frame.contentRect.width,
      frame.contentRect.height,
      frame.drawRect.x,
      frame.drawRect.y,
      frame.drawRect.width,
      frame.drawRect.height,
    );
    outputCtx.restore();
  }

  return {
    imageData: outputCtx.getImageData(0, 0, width, height),
    frames,
    sourceFrames,
    width,
    height,
  };
}

export function buildFramePlan(
  source: ImageData,
  settings: SpriteSheetSettings,
): SpriteSheetFrame[] {
  return buildFramePlanFromSourceFrames(
    buildSourceFramePlan(source, settings),
    settings,
  );
}

export function autoCenterManualFrames(
  source: ImageData,
  settings: SpriteSheetSettings,
  axis: 'x' | 'y' | 'xy',
  targetFrameIds?: Set<string>,
): SpriteSheetManualFrame[] {
  const sourceFrames = buildSourceFramePlan(source, settings);
  const frames = buildFramePlanFromSourceFrames(sourceFrames, settings);
  const manualFrames = getEffectiveManualFrames(settings);
  const metrics = frames
    .map((frame, index) => {
      if (!frame.contentRect || !frame.drawRect) return null;
      const centroid = detectOpaqueCentroid(
        source,
        frame.contentRect,
        settings.alphaThreshold,
      );
      if (!centroid) return null;
      const scaleX = frame.drawRect.width / frame.contentRect.width;
      const scaleY = frame.drawRect.height / frame.contentRect.height;
      return {
        manualFrame: manualFrames[index],
        centroidX:
          frame.drawRect.x + (centroid.x - frame.contentRect.x) * scaleX,
        centroidY:
          frame.drawRect.y + (centroid.y - frame.contentRect.y) * scaleY,
        targetX:
          frame.destinationCell.x + frame.destinationCell.width / 2,
        targetY:
          frame.destinationCell.y + frame.destinationCell.height / 2,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (metrics.length === 0) return manualFrames;
  const byId = new Map(
    metrics.map((item) => [item.manualFrame.id, item] as const),
  );

  return manualFrames.map((manualFrame) => {
    if (
      manualFrame.locked ||
      (targetFrameIds && !targetFrameIds.has(manualFrame.id))
    ) {
      return manualFrame;
    }
    const metric = byId.get(manualFrame.id);
    if (!metric) return manualFrame;
    return {
      ...manualFrame,
      offsetX:
        axis === 'y'
          ? manualFrame.offsetX
          : manualFrame.offsetX +
            Math.round(metric.targetX - metric.centroidX),
      offsetY:
        axis === 'x'
          ? manualFrame.offsetY
          : manualFrame.offsetY +
            Math.round(metric.targetY - metric.centroidY),
    };
  });
}

export function buildSourceFramePlan(
  source: ImageData,
  settings: SpriteSheetSettings,
): SpriteSheetSourceFrame[] {
  const sourceRects = getSourceGridRects(source.width, source.height, settings);
  const excluded = new Set(settings.excludedSourceFrameIndices);
  return sourceRects.map((sourceRect, sourceIndex) => {
    const contentRect = detectContentRect(
      source,
      sourceRect,
      settings.alphaThreshold,
    );
    return {
      sourceIndex,
      sourceRect,
      contentRect,
      included: !excluded.has(sourceIndex),
      empty: !contentRect,
    };
  });
}

function buildFramePlanFromSourceFrames(
  sourceFrames: SpriteSheetSourceFrame[],
  settings: SpriteSheetSettings,
): SpriteSheetFrame[] {
  const outputCount = settings.outputColumns * settings.outputRows;
  const manualFrames = getEffectiveManualFrames(settings);
  const frames: SpriteSheetFrame[] = [];

  for (let index = 0; index < outputCount; index++) {
    const manualFrame = manualFrames[index] ?? createEmptyManualFrame(index);
    const sourceFrame =
      manualFrame.sourceIndex === null
        ? undefined
        : sourceFrames.find(
            (frame) =>
              frame.sourceIndex === manualFrame.sourceIndex && frame.included,
          );
    const sourceRect =
      sourceFrame?.sourceRect ??
      ({ x: 0, y: 0, width: 0, height: 0 } satisfies Rect);
    const contentRect = sourceFrame?.contentRect ?? null;
    const destinationCell = getDestinationCell(index, settings);
    const drawRect = contentRect
      ? applyManualOffset(
          getDrawRect(contentRect, destinationCell, settings),
          manualFrame,
        )
      : null;

    frames.push({
      id: manualFrame.id,
      index,
      name: manualFrame.name,
      sourceIndex: sourceFrame?.sourceIndex ?? null,
      offsetX: manualFrame.offsetX,
      offsetY: manualFrame.offsetY,
      locked: manualFrame.locked,
      sourceRect,
      contentRect,
      destinationCell,
      drawRect,
      empty: !contentRect,
    });
  }

  return frames;
}

function createEmptyManualFrame(index: number): SpriteSheetManualFrame {
  return {
    id: `empty-${index}`,
    sourceIndex: null,
    name: `frame_${String(index + 1).padStart(3, '0')}`,
    offsetX: 0,
    offsetY: 0,
    locked: false,
  };
}

function applyManualOffset(
  rect: Rect,
  manualFrame: SpriteSheetManualFrame,
): Rect {
  return {
    ...rect,
    x: rect.x + manualFrame.offsetX,
    y: rect.y + manualFrame.offsetY,
  };
}

export function getSourceGridRects(
  sourceWidth: number,
  sourceHeight: number,
  settings: SpriteSheetSettings,
): Rect[] {
  const cols = Math.max(1, Math.floor(settings.sourceColumns));
  const rows = Math.max(1, Math.floor(settings.sourceRows));
  const marginX = Math.max(0, settings.sourceMarginX);
  const marginY = Math.max(0, settings.sourceMarginY);
  const gapX = Math.max(0, settings.sourceGapX);
  const gapY = Math.max(0, settings.sourceGapY);
  const usableWidth = Math.max(0, sourceWidth - marginX * 2 - gapX * (cols - 1));
  const usableHeight = Math.max(
    0,
    sourceHeight - marginY * 2 - gapY * (rows - 1),
  );
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;
  const rects: Rect[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = marginX + col * (cellWidth + gapX);
      const y = marginY + row * (cellHeight + gapY);
      rects.push(toIntegerRect({ x, y, width: cellWidth, height: cellHeight }));
    }
  }

  return rects;
}

export function detectContentRect(
  source: ImageData,
  rect: Rect,
  alphaThreshold: number,
): Rect | null {
  const bounds = clampRect(rect, source.width, source.height);
  const threshold = clamp(alphaThreshold, 0, 255);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const alpha = source.data[(y * source.width + x) * 4 + 3];
      if (alpha <= threshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function detectOpaqueCentroid(
  source: ImageData,
  rect: Rect,
  alphaThreshold: number,
): { x: number; y: number } | null {
  const bounds = clampRect(rect, source.width, source.height);
  const threshold = clamp(alphaThreshold, 0, 255);
  let sumX = 0;
  let sumY = 0;
  let weight = 0;

  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const alpha = source.data[(y * source.width + x) * 4 + 3];
      if (alpha <= threshold) continue;
      sumX += (x + 0.5) * alpha;
      sumY += (y + 0.5) * alpha;
      weight += alpha;
    }
  }

  if (weight === 0) return null;
  return {
    x: sumX / weight,
    y: sumY / weight,
  };
}

function getDestinationCell(
  index: number,
  settings: SpriteSheetSettings,
): Rect {
  const col = index % settings.outputColumns;
  const row = Math.floor(index / settings.outputColumns);
  return {
    x: col * settings.frameWidth,
    y: row * settings.frameHeight,
    width: settings.frameWidth,
    height: settings.frameHeight,
  };
}

function getDrawRect(
  contentRect: Rect,
  destinationCell: Rect,
  settings: SpriteSheetSettings,
): Rect {
  const padding = Math.max(0, settings.padding);
  const availableWidth = Math.max(1, destinationCell.width - padding * 2);
  const availableHeight = Math.max(1, destinationCell.height - padding * 2);
  const scale =
    settings.fitMode === 'original'
      ? 1
      : settings.fitMode === 'cover'
        ? Math.max(
            availableWidth / contentRect.width,
            availableHeight / contentRect.height,
          )
        : Math.min(
            availableWidth / contentRect.width,
            availableHeight / contentRect.height,
          );
  const width = Math.max(1, Math.round(contentRect.width * scale));
  const height = Math.max(1, Math.round(contentRect.height * scale));
  const x = Math.round(destinationCell.x + (destinationCell.width - width) / 2);
  let y: number;

  switch (settings.anchor) {
    case 'top-center':
      y = destinationCell.y + padding;
      break;
    case 'bottom-center':
      y = destinationCell.y + destinationCell.height - padding - height;
      break;
    case 'center':
      y = destinationCell.y + (destinationCell.height - height) / 2;
      break;
  }

  return { x, y: Math.round(y), width, height };
}

function getOutputWidth(settings: SpriteSheetSettings): number {
  return settings.outputColumns * settings.frameWidth;
}

function getOutputHeight(settings: SpriteSheetSettings): number {
  return settings.outputRows * settings.frameHeight;
}

function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = clamp(Math.floor(rect.x), 0, width);
  const y = clamp(Math.floor(rect.y), 0, height);
  const right = clamp(Math.ceil(rect.x + rect.width), x, width);
  const bottom = clamp(Math.ceil(rect.y + rect.height), y, height);
  return { x, y, width: right - x, height: bottom - y };
}

function toIntegerRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
