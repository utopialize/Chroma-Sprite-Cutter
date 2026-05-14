import type { CSSProperties } from 'react';
import { colors, fontSize, radii, spacing } from '../../../theme';
import { COLOR_COUNT_PRESETS, PALETTE_PRESETS } from '../lib/palettes';
import type { PixelArtPaletteMode, PixelArtPalettePresetId, RGB } from '../types';

interface PalettePanelProps {
  palette: RGB[];
  paletteMode: PixelArtPaletteMode;
  palettePreset: PixelArtPalettePresetId;
  paletteName: string;
  colorCount: number;
  onPaletteModeChange: (paletteMode: PixelArtPaletteMode) => void;
  onPalettePresetChange: (palettePreset: PixelArtPalettePresetId) => void;
  onColorCountChange: (colorCount: number) => void;
}

const styles: Record<string, CSSProperties> = {
  section: {
    padding: `${spacing.lg}px ${spacing.xl}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  group: {
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  count: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
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
  row: {
    display: 'grid',
    gridTemplateColumns: '74px minmax(0, 1fr)',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  select: {
    width: '100%',
    padding: '6px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    cursor: 'pointer',
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  hint: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.35,
  },
  empty: {
    border: `1px dashed ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
    padding: spacing.md,
    color: colors.textDim,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
    gap: spacing.sm,
  },
  swatch: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    alignItems: 'stretch',
  },
  swatchColor: {
    height: 24,
    borderRadius: radii.sm,
    border: `1px solid ${colors.borderInput}`,
  },
  swatchLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
};

export function PalettePanel({
  palette,
  paletteMode,
  palettePreset,
  paletteName,
  colorCount,
  onPaletteModeChange,
  onPalettePresetChange,
  onColorCountChange,
}: PalettePanelProps) {
  return (
    <div style={styles.section}>
      <div style={styles.group}>
        <div style={styles.titleRow}>
          <span style={styles.sectionTitle}>Palette</span>
          <span style={styles.count}>
            {palette.length} color{palette.length === 1 ? '' : 's'}
          </span>
        </div>
        <div style={styles.row}>
          <label htmlFor="pa-palette-mode" style={styles.label}>
            Mode
          </label>
          <select
            id="pa-palette-mode"
            value={paletteMode}
            onChange={(event) =>
              onPaletteModeChange(event.target.value as PixelArtPaletteMode)
            }
            style={styles.select}
          >
            <option value="auto">Auto</option>
            <option value="preset">Preset</option>
          </select>
        </div>
        <div
          style={{
            ...styles.row,
            ...(paletteMode === 'preset' ? {} : styles.disabled),
          }}
        >
          <label htmlFor="pa-palette-preset" style={styles.label}>
            Preset
          </label>
          <select
            id="pa-palette-preset"
            value={palettePreset}
            onChange={(event) =>
              onPalettePresetChange(
                event.target.value as PixelArtPalettePresetId,
              )
            }
            disabled={paletteMode !== 'preset'}
            style={styles.select}
          >
            {PALETTE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.pillGroup}>
          {COLOR_COUNT_PRESETS.map((count) => (
            <button
              key={count}
              type="button"
              style={{
                ...styles.pill,
                ...(colorCount === count ? styles.pillActive : {}),
                ...(paletteMode === 'auto' ? {} : styles.disabled),
              }}
              onClick={() => onColorCountChange(count)}
              disabled={paletteMode !== 'auto'}
            >
              {count}
            </button>
          ))}
        </div>
        <span style={styles.hint}>Active: {paletteName}</span>
        {palette.length === 0 ? (
          <div style={styles.empty}>Load a PNG to see the active palette.</div>
        ) : (
          <div style={styles.grid}>
            {palette.map((color, index) => (
              <div
                key={`${index}-${color.r}-${color.g}-${color.b}`}
                style={styles.swatch}
                title={toRgbLabel(color)}
              >
                <div
                  style={{
                    ...styles.swatchColor,
                    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  }}
                />
                <span style={styles.swatchLabel}>{toHex(color)}</span>
              </div>
            ))}
          </div>
        )}
        <span style={styles.hint}>
          Active colors are extracted from visible pixels only.
        </span>
      </div>
    </div>
  );
}

function toHex({ r, g, b }: RGB): string {
  return `#${pad(r)}${pad(g)}${pad(b)}`;
}

function toRgbLabel({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function pad(component: number): string {
  return component.toString(16).padStart(2, '0').toUpperCase();
}
