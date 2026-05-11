import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { hexToRgb, rgbToHex } from '../lib/colorUtils';
import { downloadPreset, readPresetFile } from '../lib/presets';
import type { ChromaKeySettings } from '../types/image';
import { colors, fontSize, radii, spacing } from '../theme';

export interface ControlsPanelProps {
  settings: ChromaKeySettings;
  onChange: (next: ChromaKeySettings) => void;
  eyedropperActive: boolean;
  onToggleEyedropper: () => void;
}

type SliderKey = Exclude<keyof ChromaKeySettings, 'keyColor'>;

interface SliderDef {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'tolerance', label: 'Tolerance', min: 0, max: 128, step: 1 },
  { key: 'softness', label: 'Softness', min: 0, max: 100, step: 1 },
  { key: 'spillSuppression', label: 'Spill suppression', min: 0, max: 100, step: 1 },
  { key: 'edgeCleanup', label: 'Edge cleanup', min: 0, max: 100, step: 1 },
  { key: 'preserveDetails', label: 'Preserve details', min: 0, max: 100, step: 1 },
];

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
    flex: 1,
    overflowY: 'auto',
  },
  section: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  field: { display: 'flex', flexDirection: 'column', gap: spacing.sm },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  value: { color: colors.textFaint, fontVariantNumeric: 'tabular-nums' },
  slider: { width: '100%', accentColor: colors.accentHi },
  colorRow: { display: 'flex', alignItems: 'center', gap: spacing.md + 2 },
  color: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    border: `1px solid ${colors.borderInput}`,
    padding: 0,
    background: 'transparent',
    cursor: 'pointer',
  },
  colorValue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0.4,
    flex: 1,
  },
  eyedropper: {
    padding: '6px 10px',
    borderRadius: radii.sm,
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: fontSize.xxs,
    fontWeight: 500,
    letterSpacing: 0.4,
  },
  eyedropperActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#ffffff',
  },
  presetRow: {
    display: 'flex',
    gap: spacing.md,
  },
  presetButton: {
    flex: 1,
    padding: '8px 10px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    borderRadius: radii.sm,
    cursor: 'pointer',
    fontSize: fontSize.xxs,
    fontWeight: 500,
    letterSpacing: 0.4,
  },
  error: {
    fontSize: fontSize.xxs,
    color: colors.danger,
  },
  hidden: { display: 'none' },
};

export function ControlsPanel({
  settings,
  onChange,
  eyedropperActive,
  onToggleEyedropper,
}: ControlsPanelProps) {
  const presetInputRef = useRef<HTMLInputElement>(null);
  const [presetError, setPresetError] = useState<string | null>(null);

  const update = <K extends keyof ChromaKeySettings>(
    key: K,
    value: ChromaKeySettings[K],
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const keyHex = rgbToHex(settings.keyColor);
  const eyedropperStyle: CSSProperties = {
    ...styles.eyedropper,
    ...(eyedropperActive ? styles.eyedropperActive : {}),
  };

  const handleSavePreset = () => {
    setPresetError(null);
    try {
      downloadPreset(settings);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleLoadPresetClick = () => {
    presetInputRef.current?.click();
  };

  const handleLoadPresetChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPresetError(null);
    try {
      const loaded = await readPresetFile(file);
      onChange(loaded);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : 'Load failed');
    }
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.section}>Key color</span>
      <div style={styles.colorRow}>
        <input
          type="color"
          value={keyHex}
          onChange={(e) => update('keyColor', hexToRgb(e.target.value))}
          style={styles.color}
          aria-label="Chroma key color"
        />
        <span style={styles.colorValue}>{keyHex.toUpperCase()}</span>
        <button
          type="button"
          onClick={onToggleEyedropper}
          style={eyedropperStyle}
          title="Pick color from image (I)"
          aria-pressed={eyedropperActive}
        >
          {eyedropperActive ? 'Picking…' : 'Pick'}
        </button>
      </div>

      <span style={styles.section}>Mask</span>
      {SLIDERS.map(({ key, label, min, max, step }) => (
        <div key={key} style={styles.field}>
          <div style={styles.row}>
            <span>{label}</span>
            <span style={styles.value}>{settings[key]}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={settings[key]}
            onChange={(e) => update(key, Number(e.target.value))}
            style={styles.slider}
          />
        </div>
      ))}

      <span style={styles.section}>Preset</span>
      <div style={styles.presetRow}>
        <button
          type="button"
          onClick={handleSavePreset}
          style={styles.presetButton}
          title="Save current mask settings as JSON"
        >
          Save…
        </button>
        <button
          type="button"
          onClick={handleLoadPresetClick}
          style={styles.presetButton}
          title="Load mask settings from JSON"
        >
          Load…
        </button>
      </div>
      <input
        ref={presetInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => void handleLoadPresetChange(e)}
        style={styles.hidden}
      />
      {presetError && <span style={styles.error}>{presetError}</span>}
    </div>
  );
}
