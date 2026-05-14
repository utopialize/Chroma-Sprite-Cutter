import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  buildPlaybackSequence,
  nextAnimationFrame,
  previousAnimationFrame,
  selectAnimationRange,
} from '../lib/animation';
import { getActiveAnimation } from '../lib/animationClips';
import { applyChromaKey } from '../lib/chromaKey';
import { buildSpriteSheet } from '../lib/spriteSheet';
import type { ChromaKeySettings, LoadedImage } from '../types/image';
import type {
  SpriteSheetBuildResult,
  SpriteSheetSettings,
} from '../types/spriteSheet';
import { colors, fontSize, radii, spacing } from '../theme';

export interface AnimationPreviewPanelProps {
  image: LoadedImage | null;
  settings: ChromaKeySettings;
  spriteSheetSettings: SpriteSheetSettings;
}

const CHECKER_TILE = 12;

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: spacing.xl,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  section: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  stage: {
    minHeight: 160,
    display: 'grid',
    placeItems: 'center',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgDeep,
    overflow: 'hidden',
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: 220,
    imageRendering: 'pixelated',
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: spacing.md,
  },
  toggleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.sm,
  },
  button: {
    padding: '8px 10px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
  },
  buttonDisabled: {
    color: colors.textDim,
    cursor: 'not-allowed',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: colors.accentHi,
  },
  empty: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    textAlign: 'center',
    padding: spacing.lg,
  },
};

export function AnimationPreviewPanel({
  image,
  settings,
  spriteSheetSettings,
}: AnimationPreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState({ index: 0, direction: 1 as 1 | -1 });
  const [showOnionSkin, setShowOnionSkin] = useState(true);
  const [showGroundLine, setShowGroundLine] = useState(true);
  const [showPivot, setShowPivot] = useState(true);
  const activeAnimation = getActiveAnimation(spriteSheetSettings);

  const build = useMemo(() => {
    if (!image || !spriteSheetSettings.enabled) return null;
    try {
      return buildAnimationSheet(image, settings, spriteSheetSettings);
    } catch {
      return null;
    }
  }, [image, settings, spriteSheetSettings]);

  const frameCount = build?.frames.length ?? 0;
  const disabled = !build || frameCount === 0;
  const playbackFrames = useMemo(
    () =>
      build
        ? buildPlaybackSequence(build.frames, activeAnimation.pingPong)
        : [],
    [activeAnimation.pingPong, build],
  );

  useEffect(() => {
    setFrame({ index: 0, direction: 1 });
  }, [activeAnimation.id, build]);

  useEffect(() => {
    if (!playing || disabled) return;
    const interval = window.setInterval(() => {
      setFrame((current) => {
        if (!activeAnimation.loop && current.index >= playbackFrames.length - 1) {
          window.clearInterval(interval);
          setPlaying(false);
          return current;
        }
        return nextAnimationFrame(current, playbackFrames.length, false);
      });
    }, 1000 / activeAnimation.fps);
    return () => window.clearInterval(interval);
  }, [
    activeAnimation.fps,
    activeAnimation.loop,
    playing,
    disabled,
    playbackFrames.length,
  ]);

  useEffect(() => {
    if (!build) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFrame(canvas, build, playbackFrames, frame.index, {
      anchor: spriteSheetSettings.anchor,
      showGroundLine,
      showOnionSkin,
      showPivot,
    });
  }, [
    build,
    frame.index,
    playbackFrames,
    showGroundLine,
    showOnionSkin,
    showPivot,
    spriteSheetSettings.anchor,
  ]);

  const buttonStyle: CSSProperties = {
    ...styles.button,
    ...(disabled ? styles.buttonDisabled : {}),
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.section}>Animation preview</span>
      <div style={styles.stage}>
        {build ? (
          <canvas ref={canvasRef} style={styles.canvas} />
        ) : (
          <span style={styles.empty}>Enable sheet building to preview frames.</span>
        )}
      </div>
      <div style={styles.controls}>
        <button
          type="button"
          disabled={disabled}
          style={buttonStyle}
          onClick={() =>
            setFrame((current) =>
              previousAnimationFrame(current, playbackFrames.length),
            )
          }
        >
          Prev
        </button>
        <button
          type="button"
          disabled={disabled}
          style={buttonStyle}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          disabled={disabled}
          style={buttonStyle}
          onClick={() =>
            setFrame((current) =>
              nextAnimationFrame(current, playbackFrames.length, false),
            )
          }
        >
          Next
        </button>
      </div>
      <div style={styles.toggleGrid}>
        <label style={styles.toggleRow}>
          <span>Onion skin</span>
          <input
            type="checkbox"
            checked={showOnionSkin}
            onChange={(event) => setShowOnionSkin(event.target.checked)}
            style={styles.checkbox}
          />
        </label>
        <label style={styles.toggleRow}>
          <span>Ground line</span>
          <input
            type="checkbox"
            checked={showGroundLine}
            onChange={(event) => setShowGroundLine(event.target.checked)}
            style={styles.checkbox}
          />
        </label>
        <label style={styles.toggleRow}>
          <span>Pivot</span>
          <input
            type="checkbox"
            checked={showPivot}
            onChange={(event) => setShowPivot(event.target.checked)}
            style={styles.checkbox}
          />
        </label>
      </div>
      <label style={styles.row}>
        <span>Animation</span>
        <span>{activeAnimation.name}</span>
      </label>
      <label style={styles.row}>
        <span>FPS</span>
        <span>{activeAnimation.fps}</span>
      </label>
      <label style={styles.row}>
        <span>Playback</span>
        <span>
          {activeAnimation.loop ? 'Loop' : 'Once'}
          {activeAnimation.pingPong ? ' / Ping-pong' : ''}
        </span>
      </label>
      <div style={styles.row}>
        <span>Frame</span>
        <span>
          {disabled ? '-' : `${Math.min(frame.index + 1, playbackFrames.length)} / ${playbackFrames.length}`}
        </span>
      </div>
    </div>
  );
}

function buildAnimationSheet(
  image: LoadedImage,
  settings: ChromaKeySettings,
  spriteSheetSettings: SpriteSheetSettings,
): {
  result: SpriteSheetBuildResult;
  frames: SpriteSheetBuildResult['frames'];
  sheetCanvas: HTMLCanvasElement;
} {
  const activeAnimation = getActiveAnimation(spriteSheetSettings);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('Cannot obtain 2D context');
  sourceCtx.drawImage(image.element, 0, 0);
  const source = sourceCtx.getImageData(0, 0, image.width, image.height);
  const processed = applyChromaKey(source, settings);
  const result = buildSpriteSheet(processed, spriteSheetSettings);

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = result.width;
  sheetCanvas.height = result.height;
  const sheetCtx = sheetCanvas.getContext('2d');
  if (!sheetCtx) throw new Error('Cannot obtain 2D context');
  sheetCtx.putImageData(result.imageData, 0, 0);

  return {
    result,
    frames: selectAnimationRange(
      result.frames.filter((frame) => frame.sourceIndex !== null),
      activeAnimation.startFrame,
      activeAnimation.endFrame,
    ),
    sheetCanvas,
  };
}

function drawFrame(
  canvas: HTMLCanvasElement,
  build: {
    result: SpriteSheetBuildResult;
    frames: SpriteSheetBuildResult['frames'];
    sheetCanvas: HTMLCanvasElement;
  },
  playbackFrames: SpriteSheetBuildResult['frames'],
  index: number,
  options: {
    anchor: SpriteSheetSettings['anchor'];
    showGroundLine: boolean;
    showOnionSkin: boolean;
    showPivot: boolean;
  },
): void {
  const frame = playbackFrames[index];
  if (!frame) return;
  canvas.width = frame.destinationCell.width;
  canvas.height = frame.destinationCell.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  fillChecker(ctx, canvas.width, canvas.height);
  if (options.showOnionSkin) {
    const previous = playbackFrames[index - 1];
    const next = playbackFrames[index + 1];
    ctx.save();
    ctx.globalAlpha = 0.18;
    if (previous) {
      drawSheetFrame(ctx, build.sheetCanvas, previous, canvas.width, canvas.height);
    }
    if (next) {
      drawSheetFrame(ctx, build.sheetCanvas, next, canvas.width, canvas.height);
    }
    ctx.restore();
  }
  drawSheetFrame(ctx, build.sheetCanvas, frame, canvas.width, canvas.height);
  const pivot = getPivotPoint(canvas.width, canvas.height, options.anchor);
  if (options.showGroundLine) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 174, 0, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, pivot.y + 0.5);
    ctx.lineTo(canvas.width, pivot.y + 0.5);
    ctx.stroke();
    ctx.restore();
  }
  if (options.showPivot) {
    ctx.save();
    ctx.strokeStyle = 'rgba(91,157,255,0.95)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivot.x - 4, pivot.y + 0.5);
    ctx.lineTo(pivot.x + 4, pivot.y + 0.5);
    ctx.moveTo(pivot.x + 0.5, pivot.y - 4);
    ctx.lineTo(pivot.x + 0.5, pivot.y + 4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheetCanvas: HTMLCanvasElement,
  frame: SpriteSheetBuildResult['frames'][number],
  width: number,
  height: number,
): void {
  ctx.drawImage(
    sheetCanvas,
    frame.destinationCell.x,
    frame.destinationCell.y,
    frame.destinationCell.width,
    frame.destinationCell.height,
    0,
    0,
    width,
    height,
  );
}

function fillChecker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const tile = document.createElement('canvas');
  tile.width = CHECKER_TILE;
  tile.height = CHECKER_TILE;
  const tctx = tile.getContext('2d');
  if (!tctx) return;
  const half = CHECKER_TILE / 2;
  tctx.fillStyle = colors.checkerLight;
  tctx.fillRect(0, 0, CHECKER_TILE, CHECKER_TILE);
  tctx.fillStyle = colors.checkerDark;
  tctx.fillRect(0, 0, half, half);
  tctx.fillRect(half, half, half, half);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
}

function getPivotPoint(
  width: number,
  height: number,
  anchor: SpriteSheetSettings['anchor'],
): { x: number; y: number } {
  if (anchor === 'top-center') {
    return { x: Math.round(width / 2), y: 0 };
  }
  if (anchor === 'center') {
    return { x: Math.round(width / 2), y: Math.round(height / 2) };
  }
  return { x: Math.round(width / 2), y: height - 1 };
}
