import type { CSSProperties } from 'react';
import { colors, fontSize, radii, spacing } from '../../theme';
import type { PixelArtPreviewBackground } from '../../tools/pixel-art-converter/types';
import { CheckerboardCanvas } from './CheckerboardCanvas';

interface BackgroundSelectorProps {
  value: PixelArtPreviewBackground;
  customColor: string;
  onChange: (value: PixelArtPreviewBackground) => void;
  onCustomColorChange: (color: string) => void;
}

const BACKGROUNDS: Array<{
  value: PixelArtPreviewBackground;
  label: string;
  color?: string;
}> = [
  { value: 'checkerboard', label: 'Checker' },
  { value: 'black', label: 'Black', color: '#000000' },
  { value: 'white', label: 'White', color: '#ffffff' },
  { value: 'gray', label: 'Gray', color: '#808080' },
  { value: 'green-chroma', label: 'Green', color: '#00ff00' },
  { value: 'custom', label: 'Custom' },
];

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: '5px 8px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    borderRadius: radii.pill,
    fontSize: fontSize.xxs,
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#ffffff',
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: `1px solid ${colors.borderInputHover}`,
  },
  colorInput: {
    width: 28,
    height: 24,
    padding: 0,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    cursor: 'pointer',
  },
};

export function BackgroundSelector({
  value,
  customColor,
  onChange,
  onCustomColorChange,
}: BackgroundSelectorProps) {
  return (
    <div style={styles.root} aria-label="Preview background">
      {BACKGROUNDS.map((background) => (
        <button
          key={background.value}
          type="button"
          style={{
            ...styles.button,
            ...(value === background.value ? styles.buttonActive : {}),
          }}
          onClick={() => onChange(background.value)}
        >
          {background.value === 'checkerboard' ? (
            <CheckerboardCanvas size={14} tileSize={4} />
          ) : (
            <span
              style={{
                ...styles.swatch,
                backgroundColor:
                  background.value === 'custom'
                    ? customColor
                    : background.color,
              }}
            />
          )}
          {background.label}
        </button>
      ))}
      {value === 'custom' && (
        <input
          type="color"
          value={customColor}
          onChange={(event) => onCustomColorChange(event.target.value)}
          style={styles.colorInput}
          aria-label="Custom preview background color"
        />
      )}
    </div>
  );
}
