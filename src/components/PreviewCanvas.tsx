import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { samplePixel } from '../lib/chromaKey';
import { buildSpriteSheet } from '../lib/spriteSheet';
import { stepZoom } from '../lib/zoom';
import ChromaKeyWorker from '../lib/chromaKey.worker?worker';
import type { ResultMessage } from '../lib/chromaKey.worker';
import type {
  ChromaKeySettings,
  LoadedImage,
  PreviewBackground,
  RGB,
  SpriteSheetPreviewMode,
  ViewMode,
  Zoom,
} from '../types/image';
import type {
  SpriteSheetBuildResult,
  SpriteSheetSettings,
} from '../types/spriteSheet';
import { colors, fontSize, spacing } from '../theme';

export interface PreviewCanvasProps {
  image: LoadedImage | null;
  settings: ChromaKeySettings;
  previewBackground: PreviewBackground;
  viewMode: ViewMode | SpriteSheetPreviewMode;
  zoom: Zoom;
  onZoomChange: (zoom: Zoom) => void;
  eyedropperActive: boolean;
  onPickColor: (color: RGB) => void;
  spriteSheetSettings: SpriteSheetSettings;
}

const SOLID_COLORS: Record<Exclude<PreviewBackground, 'checker'>, string> = {
  white: '#ffffff',
  black: '#000000',
  gray: '#808080',
  red: '#ff0000',
  blue: '#0000ff',
};

const CHECKER_TILE = 16;
const WRAP_PADDING = spacing.xxl;

const styles: Record<string, CSSProperties> = {
  wrap: {
    flex: 1,
    display: 'grid',
    placeContent: 'safe center',
    overflow: 'auto',
    padding: WRAP_PADDING,
    minHeight: 0,
    boxSizing: 'border-box',
    backgroundColor: colors.bgDeep,
  },
  canvasBase: {
    display: 'block',
    imageRendering: 'pixelated',
    boxShadow: `0 0 0 1px ${colors.border}, 0 12px 32px rgba(0,0,0,0.45)`,
    userSelect: 'none',
  },
  empty: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
  },
};

function fillBackground(
  ctx: CanvasRenderingContext2D,
  bg: PreviewBackground,
  width: number,
  height: number,
): void {
  if (bg !== 'checker') {
    ctx.fillStyle = SOLID_COLORS[bg];
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const tile = document.createElement('canvas');
  tile.width = CHECKER_TILE;
  tile.height = CHECKER_TILE;
  const tctx = tile.getContext('2d');
  if (!tctx) {
    ctx.fillStyle = colors.checkerLight;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const half = CHECKER_TILE / 2;
  tctx.fillStyle = colors.checkerLight;
  tctx.fillRect(0, 0, CHECKER_TILE, CHECKER_TILE);
  tctx.fillStyle = colors.checkerDark;
  tctx.fillRect(0, 0, half, half);
  tctx.fillRect(half, half, half, half);

  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) {
    ctx.fillStyle = colors.checkerLight;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
}

interface PanState {
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

interface PendingScroll {
  imgX: number;
  imgY: number;
  viewportX: number;
  viewportY: number;
}

export function PreviewCanvas({
  image,
  settings,
  previewBackground,
  viewMode,
  zoom,
  onZoomChange,
  eyedropperActive,
  onPickColor,
  spriteSheetSettings,
}: PreviewCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const panRef = useRef<PanState | null>(null);
  const pendingScrollRef = useRef<PendingScroll | null>(null);

  const [workerReady, setWorkerReady] = useState(false);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);
  const [processedImageData, setProcessedImageData] =
    useState<ImageData | null>(null);

  const spriteSheetResult = useMemo<SpriteSheetBuildResult | null>(() => {
    if (!spriteSheetSettings.enabled || !processedImageData) return null;
    return buildSpriteSheet(processedImageData, spriteSheetSettings);
  }, [processedImageData, spriteSheetSettings]);

  useEffect(() => {
    const worker = new ChromaKeyWorker();
    workerRef.current = worker;
    const handler = (event: MessageEvent<ResultMessage>) => {
      if (event.data.type !== 'result') return;
      if (event.data.requestId !== requestIdRef.current) return;
      setProcessedImageData(event.data.result);
    };
    worker.addEventListener('message', handler);
    setWorkerReady(true);
    return () => {
      worker.removeEventListener('message', handler);
      worker.terminate();
      workerRef.current = null;
      setWorkerReady(false);
    };
  }, []);

  useEffect(() => {
    if (!image) {
      setSourceImageData(null);
      setProcessedImageData(null);
      return;
    }
    const off = document.createElement('canvas');
    off.width = image.width;
    off.height = image.height;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(image.element, 0, 0);
    setSourceImageData(ctx.getImageData(0, 0, image.width, image.height));
    setProcessedImageData(null);
  }, [image]);

  useEffect(() => {
    if (!workerReady) return;
    const worker = workerRef.current;
    if (!worker) return;
    if (sourceImageData) {
      worker.postMessage({ type: 'setSource', source: sourceImageData });
    } else {
      worker.postMessage({ type: 'clear' });
    }
  }, [workerReady, sourceImageData]);

  useEffect(() => {
    if (!workerReady || !sourceImageData) return;
    const worker = workerRef.current;
    if (!worker) return;
    const requestId = ++requestIdRef.current;
    worker.postMessage({ type: 'apply', settings, requestId });
  }, [workerReady, sourceImageData, settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const showSheetOutput =
      (viewMode === 'processed' ||
        viewMode === 'sheet-extracted' ||
        viewMode === 'sheet-final') &&
      spriteSheetResult;
    const width = showSheetOutput ? spriteSheetResult.width : image.width;
    const height = showSheetOutput ? spriteSheetResult.height : image.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    fillBackground(ctx, previewBackground, width, height);

    if (viewMode === 'original' || !processedImageData) {
      ctx.drawImage(image.element, 0, 0);
      return;
    }

    if (viewMode === 'sheet-source' && spriteSheetResult) {
      const off = ensureOffscreen(offscreenRef, image.width, image.height);
      const offCtx = off.getContext('2d');
      if (!offCtx) return;
      offCtx.clearRect(0, 0, off.width, off.height);
      offCtx.putImageData(processedImageData, 0, 0);
      ctx.drawImage(off, 0, 0);
      drawSourceOverlay(ctx, spriteSheetResult);
      return;
    }

    if (viewMode === 'alpha') {
      drawAlphaMask(ctx, processedImageData);
      return;
    }

    if (showSheetOutput) {
      const off = ensureOffscreen(offscreenRef, width, height);
      const offCtx = off.getContext('2d');
      if (!offCtx) return;
      offCtx.clearRect(0, 0, off.width, off.height);
      offCtx.putImageData(spriteSheetResult.imageData, 0, 0);
      ctx.drawImage(off, 0, 0);
      if (viewMode !== 'sheet-final') {
        drawSpriteSheetOverlay(ctx, spriteSheetResult);
      }
      return;
    }

    const off = ensureOffscreen(offscreenRef, image.width, image.height);
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    offCtx.clearRect(0, 0, off.width, off.height);
    offCtx.putImageData(processedImageData, 0, 0);

    if (viewMode === 'split') {
      const splitX = Math.floor(image.width / 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, image.height);
      ctx.clip();
      ctx.drawImage(image.element, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, image.width - splitX, image.height);
      ctx.clip();
      ctx.drawImage(off, 0, 0);
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(splitX, 0, 1, image.height);
      return;
    }

    ctx.drawImage(off, 0, 0);
  }, [
    image,
    viewMode,
    previewBackground,
    processedImageData,
    spriteSheetResult,
  ]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const pending = pendingScrollRef.current;
    if (!wrap || !pending || zoom === 'fit') {
      pendingScrollRef.current = null;
      return;
    }
    const numericZoom = typeof zoom === 'number' ? zoom : 1;
    wrap.scrollLeft =
      WRAP_PADDING + pending.imgX * numericZoom - pending.viewportX;
    wrap.scrollTop =
      WRAP_PADDING + pending.imgY * numericZoom - pending.viewportY;
    pendingScrollRef.current = null;
  }, [zoom]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const handler = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (!image) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const currentZoom = canvasRect.width / canvas.width;
      const imgX = (event.clientX - canvasRect.left) / currentZoom;
      const imgY = (event.clientY - canvasRect.top) / currentZoom;

      const direction = event.deltaY < 0 ? 1 : -1;
      const nextZoom = stepZoom(zoom, direction);
      if (nextZoom === zoom) return;

      const wrapRect = wrap.getBoundingClientRect();
      pendingScrollRef.current = {
        imgX,
        imgY,
        viewportX: event.clientX - wrapRect.left,
        viewportY: event.clientY - wrapRect.top,
      };
      onZoomChange(nextZoom);
    };
    wrap.addEventListener('wheel', handler, { passive: false });
    return () => wrap.removeEventListener('wheel', handler);
  }, [image, zoom, onZoomChange]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const pan = panRef.current;
      const wrap = wrapRef.current;
      if (!pan || !wrap) return;
      wrap.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
      wrap.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
    };
    const handleUp = () => {
      panRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleCanvasClick = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive || !sourceImageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== sourceImageData.width || canvas.height !== sourceImageData.height) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const imgX = (event.clientX - rect.left) * scaleX;
    const imgY = (event.clientY - rect.top) * scaleY;
    const color = samplePixel(sourceImageData, imgX, imgY);
    if (color) onPickColor(color);
  };

  const handleCanvasMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (eyedropperActive) return;
    if (event.button !== 0 && event.button !== 1) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (
      wrap.scrollWidth <= wrap.clientWidth &&
      wrap.scrollHeight <= wrap.clientHeight
    ) {
      return;
    }
    event.preventDefault();
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: wrap.scrollLeft,
      scrollTop: wrap.scrollTop,
    };
  };

  if (!image) {
    return (
      <div ref={wrapRef} style={styles.wrap}>
        <span style={styles.empty}>No image loaded</span>
      </div>
    );
  }

  const displayWidth =
    (viewMode === 'processed' ||
      viewMode === 'sheet-extracted' ||
      viewMode === 'sheet-final') &&
    spriteSheetResult
      ? spriteSheetResult.width
      : image.width;
  const displayHeight =
    (viewMode === 'processed' ||
      viewMode === 'sheet-extracted' ||
      viewMode === 'sheet-final') &&
    spriteSheetResult
      ? spriteSheetResult.height
      : image.height;

  const canvasStyle: CSSProperties = {
    ...styles.canvasBase,
    cursor: eyedropperActive ? 'crosshair' : 'grab',
    ...(zoom === 'fit'
      ? { maxWidth: '100%', maxHeight: '100%' }
      : { width: displayWidth * zoom, height: displayHeight * zoom }),
  };

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
      />
    </div>
  );
}

function drawAlphaMask(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
): void {
  const mask = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i + 3];
    mask.data[i] = alpha;
    mask.data[i + 1] = alpha;
    mask.data[i + 2] = alpha;
    mask.data[i + 3] = 255;
  }
  ctx.putImageData(mask, 0, 0);
}

function drawSourceOverlay(
  ctx: CanvasRenderingContext2D,
  result: SpriteSheetBuildResult,
): void {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textBaseline = 'top';

  for (const frame of result.frames) {
    const source = frame.sourceRect;
    if (source.width <= 0 || source.height <= 0) continue;
    ctx.strokeStyle = frame.empty
      ? 'rgba(226,106,106,0.78)'
      : 'rgba(91,157,255,0.78)';
    ctx.strokeRect(
      source.x + 0.5,
      source.y + 0.5,
      source.width - 1,
      source.height - 1,
    );
    if (frame.contentRect) {
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.strokeRect(
        frame.contentRect.x + 0.5,
        frame.contentRect.y + 0.5,
        frame.contentRect.width - 1,
        frame.contentRect.height - 1,
      );
    }
    const label = String(frame.index + 1);
    const labelWidth = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(16,17,19,0.72)';
    ctx.fillRect(source.x + 4, source.y + 4, labelWidth, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(label, source.x + 8, source.y + 7);
  }

  ctx.restore();
}

function drawSpriteSheetOverlay(
  ctx: CanvasRenderingContext2D,
  result: SpriteSheetBuildResult,
): void {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(91,157,255,0.72)';
  ctx.fillStyle = 'rgba(16,17,19,0.72)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textBaseline = 'top';

  for (const frame of result.frames) {
    const cell = frame.destinationCell;
    ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.width - 1, cell.height - 1);
    if (frame.drawRect) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeRect(
        frame.drawRect.x + 0.5,
        frame.drawRect.y + 0.5,
        frame.drawRect.width - 1,
        frame.drawRect.height - 1,
      );
      ctx.strokeStyle = 'rgba(91,157,255,0.72)';
    }
    const label = String(frame.index + 1);
    const labelWidth = ctx.measureText(label).width + 8;
    ctx.fillRect(cell.x + 4, cell.y + 4, labelWidth, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(label, cell.x + 8, cell.y + 7);
    ctx.fillStyle = 'rgba(16,17,19,0.72)';
  }

  ctx.restore();
}

function ensureOffscreen(
  ref: { current: HTMLCanvasElement | null },
  width: number,
  height: number,
): HTMLCanvasElement {
  let canvas = ref.current;
  if (!canvas) {
    canvas = document.createElement('canvas');
    ref.current = canvas;
  }
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return canvas;
}
