import { useState } from 'react';
import type { CSSProperties } from 'react';
import { exportTransparentPng } from '../lib/imageIO';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !image || busy;
  const buttonStyle: CSSProperties = {
    ...styles.button,
    ...(disabled ? styles.buttonDisabled : {}),
  };

  const handleExport = async () => {
    if (!image) return;
    setBusy(true);
    setError(null);
    try {
      await exportTransparentPng(image, settings, spriteSheetSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>Export</span>
      <button
        type="button"
        disabled={disabled}
        style={buttonStyle}
        onClick={() => void handleExport()}
      >
        {busy
          ? 'Exporting...'
          : spriteSheetSettings.enabled
            ? 'Export sprite sheet PNG'
            : 'Export transparent PNG'}
      </button>
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}
