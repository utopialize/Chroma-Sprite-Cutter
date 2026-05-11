import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
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
};

export function ExportPanel({
  image,
  settings,
  spriteSheetSettings,
}: ExportPanelProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}
