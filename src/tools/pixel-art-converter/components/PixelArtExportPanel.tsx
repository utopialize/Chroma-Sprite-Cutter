import { useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, fontSize, radii, spacing } from '../../../theme';
import { exportPixelArtPng } from '../../../shared/lib/imageIO';
import { EXPORT_SCALES, type PixelArtResult } from '../lib/pixelate';
import type { PixelArtSourceImage } from '../types';

interface PixelArtExportPanelProps {
  sourceImage: PixelArtSourceImage | null;
  pixelArt: PixelArtResult | null;
  exportScale: number;
  onExportScaleChange: (exportScale: number) => void;
}

const styles: Record<string, CSSProperties> = {
  section: {
    padding: `${spacing.lg}px ${spacing.xl}px ${spacing.xl}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  card: {
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 1.5,
  },
  pillGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    padding: '5px 10px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    borderRadius: radii.pill,
    fontSize: fontSize.xxs,
    fontWeight: 600,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#ffffff',
  },
  primaryButton: {
    padding: '10px 14px',
    border: 'none',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.bgRaised,
    color: colors.textDim,
    cursor: 'not-allowed',
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.xxs,
  },
};

export function PixelArtExportPanel({
  sourceImage,
  pixelArt,
  exportScale,
  onExportScaleChange,
}: PixelArtExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !sourceImage || !pixelArt || isExporting;

  const handleExport = async () => {
    if (!sourceImage || !pixelArt) return;
    setIsExporting(true);
    setError(null);
    try {
      await exportPixelArtPng(sourceImage.name, pixelArt.canvas, exportScale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={styles.section}>
      <span style={styles.sectionTitle}>Export</span>
      <div style={styles.card}>
        <div style={styles.pillGroup}>
          {EXPORT_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              style={{
                ...styles.pill,
                ...(exportScale === scale ? styles.pillActive : {}),
              }}
              onClick={() => onExportScaleChange(scale)}
            >
              {scale}x
            </button>
          ))}
        </div>
        <button
          type="button"
          style={{
            ...styles.primaryButton,
            ...(disabled ? styles.primaryButtonDisabled : {}),
          }}
          disabled={disabled}
          onClick={() => void handleExport()}
        >
          {isExporting ? 'Exporting...' : 'Export Pixel PNG'}
        </button>
        {error && <span style={styles.error}>{error}</span>}
      </div>
    </div>
  );
}
