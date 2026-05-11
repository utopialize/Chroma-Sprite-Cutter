import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { nextAnimationFrame, previousAnimationFrame } from '../lib/animation';
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
  slider: {
    width: '100%',
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
  const [fps, setFps] = useState(8);
  const [pingPong, setPingPong] = useState(false);
  const [frame, setFrame] = useState({ index: 0, direction: 1 as 1 | -1 });

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

  useEffect(() => {
    setFrame({ index: 0, direction: 1 });
  }, [build]);

  useEffect(() => {
    if (!playing || disabled) return;
    const interval = window.setInterval(() => {
      setFrame((current) => nextAnimationFrame(current, frameCount, pingPong));
    }, 1000 / fps);
    return () => window.clearInterval(interval);
  }, [playing, disabled, frameCount, fps, pingPong]);

  useEffect(() => {
    if (!build) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFrame(canvas, build, frame.index);
  }, [build, frame.index]);

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
            setFrame((current) => previousAnimationFrame(current, frameCount))
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
              nextAnimationFrame(current, frameCount, false),
            )
          }
        >
          Next
        </button>
      </div>
      <label style={styles.row}>
        <span>FPS</span>
        <span>{fps}</span>
      </label>
      <input
        type="range"
        min={1}
        max={24}
        value={fps}
        onChange={(event) => setFps(Number(event.target.value))}
        style={styles.slider}
      />
      <label style={styles.row}>
        <span>Ping-pong</span>
        <input
          type="checkbox"
          checked={pingPong}
          onChange={(event) => setPingPong(event.target.checked)}
        />
      </label>
      <div style={styles.row}>
        <span>Frame</span>
        <span>
          {disabled ? '-' : `${frame.index + 1} / ${frameCount}`}
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
    frames: result.frames.filter((frame) => frame.sourceIndex !== null),
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
  index: number,
): void {
  const frame = build.frames[index];
  if (!frame) return;
  canvas.width = frame.destinationCell.width;
  canvas.height = frame.destinationCell.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  fillChecker(ctx, canvas.width, canvas.height);
  ctx.drawImage(
    build.sheetCanvas,
    frame.destinationCell.x,
    frame.destinationCell.y,
    frame.destinationCell.width,
    frame.destinationCell.height,
    0,
    0,
    canvas.width,
    canvas.height,
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
