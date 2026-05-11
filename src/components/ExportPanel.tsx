import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  exportAnimationGif,
  exportIndividualFrames,
  exportSpriteSheetMetadata,
  exportTransparentPng,
} from '../lib/imageIO';
import type { ChromaKeySettings, LoadedImage } from '../types/image';
import type { SpriteSheetSettings } from '../types/spriteSheet';
import { colors, fontSize, radii, spacing } from '../theme';

export interface ExportPanelProps {
  image: LoadedImage | null;
  settings: ChromaKeySettings;
  spriteSheetSettings: SpriteSheetSettings;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: spacing.xl,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md + 2,
    backgroundColor: colors.bgPanelLight,
  },
  label: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  button: {
    padding: '10px 12px',
    backgroundColor: colors.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: radii.md,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    backgroundColor: colors.bgRaised,
    color: colors.textDim,
    cursor: 'not-allowed',
  },
  secondaryButton: {
    padding: '9px 12px',
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
  },
  error: {
    fontSize: fontSize.xxs,
    color: colors.danger,
  },
  gifRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  gifButton: {
    flex: 1,
    padding: '9px 12px',
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
  },
  fpsField: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `0 ${spacing.md}px`,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    color: colors.textMuted,
    fontSize: fontSize.xxs,
  },
  fpsInput: {
    width: 44,
    padding: '6px 4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
  },
};

export function ExportPanel({
  image,
  settings,
  spriteSheetSettings,
}: ExportPanelProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gifFps, setGifFps] = useState(8);

  const disabled = !image || busyAction !== null;
  const buttonStyle: CSSProperties = {
    ...styles.button,
    ...(disabled ? styles.buttonDisabled : {}),
  };
  const secondaryButtonStyle: CSSProperties = {
    ...styles.secondaryButton,
    ...(disabled ? styles.buttonDisabled : {}),
  };

  const runExport = async (
    action: string,
    task: (loadedImage: LoadedImage) => Promise<void>,
  ) => {
    const loadedImage = image;
    if (!loadedImage) return;
    setBusyAction(action);
    setError(null);
    try {
      await task(loadedImage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>Export</span>
      <button
        type="button"
        disabled={disabled}
        style={buttonStyle}
        onClick={() =>
          void runExport('png', (loadedImage) =>
            exportTransparentPng(loadedImage, settings, spriteSheetSettings),
          )
        }
      >
        {busyAction === 'png'
          ? 'Exporting...'
          : spriteSheetSettings.enabled
            ? 'Export sprite sheet PNG'
            : 'Export transparent PNG'}
      </button>
      <button
        type="button"
        disabled={disabled}
        style={secondaryButtonStyle}
        onClick={() =>
          void runExport('metadata', (loadedImage) =>
            exportSpriteSheetMetadata(
              loadedImage,
              settings,
              spriteSheetSettings,
            ),
          )
        }
      >
        {busyAction === 'metadata' ? 'Exporting...' : 'Export JSON metadata'}
      </button>
      {spriteSheetSettings.enabled && (
        <button
          type="button"
          disabled={disabled}
          style={secondaryButtonStyle}
          onClick={() =>
            void runExport('frames', (loadedImage) =>
              exportIndividualFrames(loadedImage, settings, spriteSheetSettings),
            )
          }
        >
          {busyAction === 'frames' ? 'Exporting...' : 'Export individual frames'}
        </button>
      )}
      {spriteSheetSettings.enabled && (
        <div style={styles.gifRow}>
          <button
            type="button"
            disabled={disabled}
            style={{
              ...styles.gifButton,
              ...(disabled ? styles.buttonDisabled : {}),
            }}
            onClick={() =>
              void runExport('gif', (loadedImage) =>
                exportAnimationGif(
                  loadedImage,
                  settings,
                  spriteSheetSettings,
                  { fps: gifFps },
                ),
              )
            }
          >
            {busyAction === 'gif'
              ? 'Encoding GIF...'
              : 'Export animation GIF'}
          </button>
          <label style={styles.fpsField} title="Frames per second">
            <span>FPS</span>
            <input
              type="number"
              min={1}
              max={60}
              value={gifFps}
              disabled={busyAction !== null}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) {
                  setGifFps(Math.max(1, Math.min(60, Math.round(next))));
                }
              }}
              style={styles.fpsInput}
            />
          </label>
        </div>
      )}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}
