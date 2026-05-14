import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { colors, fontSize, radii, spacing } from '../../../theme';
import { BackgroundSelector } from '../../../shared/components/BackgroundSelector';
import type { PixelArtResult } from '../lib/pixelate';
import {
  PIXEL_ART_PREVIEW_MODES,
  type PixelArtPreviewBackground,
  type PixelArtPreviewMode,
  type PixelArtSourceImage,
  type RGB,
} from '../types';

interface PixelArtPreviewProps {
  image: PixelArtSourceImage | null;
  pixelArt: PixelArtResult | null;
  targetWidth: number;
  targetHeight: number;
  exportScale: number;
  previewMode: PixelArtPreviewMode;
  previewBackground: PixelArtPreviewBackground;
  previewBackgroundColor: string;
  onPreviewModeChange: (previewMode: PixelArtPreviewMode) => void;
  onPreviewBackgroundChange: (background: PixelArtPreviewBackground) => void;
  onPreviewBackgroundColorChange: (color: string) => void;
  eyedropperEnabled: boolean;
  onPickKeyColor: (color: RGB) => void;
}

const CHECKER_SIZE = 12;

const styles: Record<string, CSSProperties> = {
  root: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  intro: {
    padding: `${spacing.md}px ${spacing.xl}px`,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanelLight,
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  topBar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'start',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: spacing.sm,
  },
  previewTools: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  toolLabel: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  select: {
    width: 142,
    padding: '6px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    cursor: 'pointer',
  },
  metric: {
    minWidth: 0,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  metricLabel: {
    display: 'block',
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metricValue: {
    display: 'block',
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontVariantNumeric: 'tabular-nums',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  introText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  grid: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  pane: {
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanelLight,
    overflow: 'hidden',
  },
  paneEyedropper: {
    borderColor: colors.accentHi,
    boxShadow: `0 0 0 1px ${colors.accentHi}`,
  },
  paneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    borderBottom: `1px solid ${colors.borderInput}`,
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paneHeaderDimensions: {
    color: colors.textMuted,
    fontVariantNumeric: 'tabular-nums',
    textTransform: 'none',
    letterSpacing: 0,
  },
  paneBody: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    placeItems: 'center',
    padding: spacing.lg,
    overflow: 'auto',
  },
  paneBodyEmpty: {
    backgroundImage: 'none',
    backgroundColor: colors.bgPanelLight,
    color: colors.textDim,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    display: 'block',
  },
  canvasEyedropper: {
    cursor: 'crosshair',
    outline: `2px solid ${colors.accentHi}`,
    outlineOffset: 4,
  },
};

const INTRO: Record<PixelArtPreviewMode, string> = {
  original: 'Original source image only.',
  'pixel-art': 'Pixel art result displayed at the same visual size as the source.',
  'side-by-side': 'Original on the left, pixel art result on the right.',
  'split-view': 'Split comparison: original left side, pixel art right side.',
};

export function PixelArtPreview({
  image,
  pixelArt,
  targetWidth,
  targetHeight,
  exportScale,
  previewMode,
  previewBackground,
  previewBackgroundColor,
  onPreviewModeChange,
  onPreviewBackgroundChange,
  onPreviewBackgroundColorChange,
  eyedropperEnabled,
  onPickKeyColor,
}: PixelArtPreviewProps) {
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const sideOriginalRef = useRef<HTMLCanvasElement>(null);
  const pixelArtCanvasRef = useRef<HTMLCanvasElement>(null);
  const sidePixelArtRef = useRef<HTMLCanvasElement>(null);
  const splitCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawsOriginal =
    previewMode === 'original' || previewMode === 'side-by-side';
  const drawsPixelArt =
    previewMode === 'pixel-art' || previewMode === 'side-by-side';
  const drawsSplit = previewMode === 'split-view';

  const pickSourcePixel = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!eyedropperEnabled || !image) return;
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = Math.max(
        0,
        Math.min(
          image.width - 1,
          Math.floor(((event.clientX - rect.left) / rect.width) * image.width),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          image.height - 1,
          Math.floor(
            ((event.clientY - rect.top) / rect.height) * image.height,
          ),
        ),
      );

      let sampleCanvas = sampleCanvasRef.current;
      if (!sampleCanvas) {
        sampleCanvas = document.createElement('canvas');
        sampleCanvasRef.current = sampleCanvas;
      }
      if (sampleCanvas.width !== image.width) sampleCanvas.width = image.width;
      if (sampleCanvas.height !== image.height) sampleCanvas.height = image.height;
      const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, image.width, image.height);
      ctx.drawImage(image.element, 0, 0);
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      onPickKeyColor({ r, g, b });
    },
    [eyedropperEnabled, image, onPickKeyColor],
  );

  useEffect(() => {
    if (!drawsOriginal || !image) return;
    const targets = [sourceCanvasRef.current, sideOriginalRef.current];
    for (const canvas of targets) {
      if (!canvas) continue;
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image.element, 0, 0);
    }
  }, [image, drawsOriginal]);

  useEffect(() => {
    if (!drawsPixelArt || !pixelArt || !image) return;
    const targets = [pixelArtCanvasRef.current, sidePixelArtRef.current];
    for (const canvas of targets) {
      if (!canvas) continue;
      drawPixelArtMatchedToSource(
        canvas,
        pixelArt.canvas,
        image.width,
        image.height,
      );
    }
  }, [pixelArt, image, drawsPixelArt]);

  useEffect(() => {
    if (!drawsSplit || !image || !pixelArt) return;
    const canvas = splitCanvasRef.current;
    if (!canvas) return;
    const width = image.width;
    const height = image.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    const splitX = Math.floor(width / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();
    ctx.drawImage(image.element, 0, 0, width, height);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, width - splitX, height);
    ctx.clip();
    ctx.drawImage(pixelArt.canvas, 0, 0, width, height);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillRect(splitX, 0, 1, height);
  }, [drawsSplit, image, pixelArt]);

  const sourceDimensions = image ? `${image.width} x ${image.height} px` : null;
  const pixelArtDimensions = pixelArt
    ? `${pixelArt.width} x ${pixelArt.height} px`
    : null;
  const targetDimensions = `${targetWidth} x ${targetHeight} px`;
  const displayDimensions = sourceDimensions ? 'match source' : 'No image';
  const exportDimensions = pixelArt
    ? `${pixelArt.width * exportScale} x ${pixelArt.height * exportScale} px`
    : `${targetWidth * exportScale} x ${targetHeight * exportScale} px`;

  return (
    <div style={styles.root}>
      <div style={styles.intro}>
        <div style={styles.topBar}>
          <div style={styles.metrics}>
            <Metric label="Source" value={sourceDimensions ?? 'No image'} />
            <Metric label="Target" value={targetDimensions} />
            <Metric label="Display" value={displayDimensions} />
            <Metric label="Export" value={exportDimensions} />
          </div>
          <div style={styles.previewTools}>
            <span style={styles.toolLabel}>Preview</span>
            <select
              value={previewMode}
              onChange={(event) =>
                onPreviewModeChange(event.target.value as PixelArtPreviewMode)
              }
              style={styles.select}
              aria-label="Preview mode"
            >
              {PIXEL_ART_PREVIEW_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={styles.toolLabel}>Background</span>
            <BackgroundSelector
              value={previewBackground}
              customColor={previewBackgroundColor}
              onChange={onPreviewBackgroundChange}
              onCustomColorChange={onPreviewBackgroundColorChange}
            />
          </div>
        </div>
        <div style={styles.introText}>{INTRO[previewMode]}</div>
      </div>
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns:
            previewMode === 'side-by-side'
              ? 'minmax(0, 1fr) minmax(0, 1fr)'
              : 'minmax(0, 1fr)',
        }}
      >
        {previewMode === 'original' && (
          <Pane
            title="Original"
            dimensions={sourceDimensions}
            empty={!image}
            emptyMessage="No image loaded"
            eyedropperActive={eyedropperEnabled}
            previewBackground={previewBackground}
            previewBackgroundColor={previewBackgroundColor}
          >
            <canvas
              ref={sourceCanvasRef}
              style={{
                ...styles.canvas,
                ...(eyedropperEnabled ? styles.canvasEyedropper : {}),
              }}
              onClick={pickSourcePixel}
              aria-label={image ? `Source image ${image.name}` : 'Original'}
            />
          </Pane>
        )}

        {previewMode === 'pixel-art' && (
          <Pane
            title="Pixel art"
            dimensions={pixelArtDimensions}
            empty={!pixelArt}
            emptyMessage="Load a PNG to see the pixel art preview"
            previewBackground={previewBackground}
            previewBackgroundColor={previewBackgroundColor}
          >
            <canvas
              ref={pixelArtCanvasRef}
              style={styles.canvas}
              aria-label="Pixel art preview"
            />
          </Pane>
        )}

        {previewMode === 'split-view' && (
          <Pane
            title="Split view"
            dimensions={pixelArtDimensions}
            empty={!pixelArt}
            emptyMessage="Load a PNG to compare original and pixel art"
            previewBackground={previewBackground}
            previewBackgroundColor={previewBackgroundColor}
          >
            <canvas
              ref={splitCanvasRef}
              style={styles.canvas}
              onClick={pickSourcePixel}
              aria-label="Split original and pixel art preview"
            />
          </Pane>
        )}

        {previewMode === 'side-by-side' && (
          <>
            <Pane
              title="Original"
              dimensions={sourceDimensions}
              empty={!image}
              emptyMessage="No image loaded"
              eyedropperActive={eyedropperEnabled}
              previewBackground={previewBackground}
              previewBackgroundColor={previewBackgroundColor}
            >
              <canvas
                ref={sideOriginalRef}
                style={{
                  ...styles.canvas,
                  ...(eyedropperEnabled ? styles.canvasEyedropper : {}),
                }}
                onClick={pickSourcePixel}
                aria-label={image ? `Source image ${image.name}` : 'Original'}
              />
            </Pane>
            <Pane
              title="Pixel art preview"
              dimensions={pixelArtDimensions}
              empty={!pixelArt}
              emptyMessage="Load a PNG to see the pixel art preview"
              previewBackground={previewBackground}
              previewBackgroundColor={previewBackgroundColor}
            >
              <canvas
                ref={sidePixelArtRef}
                style={styles.canvas}
                aria-label="Pixel art preview"
              />
            </Pane>
          </>
        )}
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <span style={styles.metricValue}>{value}</span>
    </div>
  );
}

interface PaneProps {
  title: string;
  dimensions: string | null;
  empty: boolean;
  emptyMessage: string;
  previewBackground: PixelArtPreviewBackground;
  previewBackgroundColor: string;
  eyedropperActive?: boolean;
  children: ReactNode;
}

function Pane({
  title,
  dimensions,
  empty,
  emptyMessage,
  previewBackground,
  previewBackgroundColor,
  eyedropperActive,
  children,
}: PaneProps) {
  return (
    <section
      style={{
        ...styles.pane,
        ...(eyedropperActive && !empty ? styles.paneEyedropper : {}),
      }}
    >
      <div style={styles.paneHeader}>
        <span>{title}</span>
        {dimensions && (
          <span style={styles.paneHeaderDimensions}>{dimensions}</span>
        )}
      </div>
      <div
        style={{
          ...styles.paneBody,
          ...getPreviewBackgroundStyle(previewBackground, previewBackgroundColor),
          ...(empty ? styles.paneBodyEmpty : {}),
        }}
      >
        {empty ? <span>{emptyMessage}</span> : children}
      </div>
    </section>
  );
}

function getPreviewBackgroundStyle(
  previewBackground: PixelArtPreviewBackground,
  customColor: string,
): CSSProperties {
  if (previewBackground === 'checkerboard') {
    return {
      backgroundImage: `
        linear-gradient(45deg, ${colors.checkerDark} 25%, transparent 25%),
        linear-gradient(-45deg, ${colors.checkerDark} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${colors.checkerDark} 75%),
        linear-gradient(-45deg, transparent 75%, ${colors.checkerDark} 75%)
      `,
      backgroundSize: `${CHECKER_SIZE * 2}px ${CHECKER_SIZE * 2}px`,
      backgroundPosition: `0 0, 0 ${CHECKER_SIZE}px, ${CHECKER_SIZE}px -${CHECKER_SIZE}px, -${CHECKER_SIZE}px 0`,
      backgroundColor: colors.checkerLight,
    };
  }
  const solidColors: Record<Exclude<PixelArtPreviewBackground, 'checkerboard' | 'custom'>, string> = {
    black: '#000000',
    white: '#ffffff',
    gray: '#808080',
    'green-chroma': '#00ff00',
  };
  return {
    backgroundImage: 'none',
    backgroundColor:
      previewBackground === 'custom' ? customColor : solidColors[previewBackground],
  };
}

function drawPixelArtMatchedToSource(
  canvas: HTMLCanvasElement,
  pixelArtCanvas: HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
): void {
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, sourceWidth, sourceHeight);
  ctx.drawImage(pixelArtCanvas, 0, 0, sourceWidth, sourceHeight);
}
