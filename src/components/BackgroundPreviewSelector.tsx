import type { CSSProperties } from 'react';
import type { PreviewBackground } from '../types/image';
import { colors, fontSize, radii, spacing } from '../theme';

export interface BackgroundPreviewSelectorProps {
  value: PreviewBackground;
  onChange: (next: PreviewBackground) => void;
}

const OPTIONS: { value: PreviewBackground; label: string }[] = [
  { value: 'checker', label: 'Checker' },
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'gray', label: 'Gray' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
];

const styles: Record<string, CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
    backgroundColor: colors.bgPanelLight,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  label: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: spacing.xs,
  },
  pill: {
    padding: '4px 10px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    borderRadius: radii.pill,
    fontSize: fontSize.xxs,
    cursor: 'pointer',
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#ffffff',
  },
};

export function BackgroundPreviewSelector({
  value,
  onChange,
}: BackgroundPreviewSelectorProps) {
  return (
    <div style={styles.bar}>
      <span style={styles.label}>Preview bg</span>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        const buttonStyle: CSSProperties = {
          ...styles.pill,
          ...(active ? styles.pillActive : {}),
        };
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={buttonStyle}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
