import type { ChangeEvent, CSSProperties } from 'react';
import { colors, fontSize, radii, spacing } from '../../../theme';
import {
  clampDimension,
  deriveLockedHeight,
  deriveLockedWidth,
  SIZE_PRESETS,
} from '../lib/pixelate';
import type { PixelArtSettings } from '../lib/pixelate';
import type { EdgeEnhancementMode } from '../lib/edgeEnhancement';
import {
  type PixelArtDitheringMode,
  type PixelArtSourceImage,
  type RGB,
} from '../types';

interface PixelArtControlsProps {
  settings: PixelArtSettings;
  onChange: (settings: PixelArtSettings) => void;
  sourceImage: PixelArtSourceImage | null;
  eyedropperEnabled: boolean;
  onToggleEyedropper: () => void;
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
  groupTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '92px minmax(0, 1fr)',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontVariantNumeric: 'tabular-nums',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    cursor: 'pointer',
    userSelect: 'none',
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
  hint: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.35,
  },
  rangeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  range: {
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
    accentColor: colors.accent,
  },
  rangeValue: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 38,
    textAlign: 'right',
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
  colorInput: {
    width: '100%',
    height: 28,
    padding: 0,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    cursor: 'pointer',
  },
  eyedropperButton: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.borderInputHover}`,
    backgroundColor: colors.bgRaised,
    color: colors.textPrimary,
    borderRadius: radii.sm,
    fontSize: fontSize.xs,
    fontWeight: 600,
    cursor: 'pointer',
  },
  eyedropperButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentHi,
    color: '#ffffff',
  },
  eyedropperButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  advanced: {
    borderTop: `1px solid ${colors.borderInput}`,
    paddingTop: spacing.sm,
  },
  advancedSummary: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    cursor: 'pointer',
    userSelect: 'none',
  },
  advancedBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
};

function rgbToHex({ r, g, b }: RGB): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(component: number): string {
  return Math.max(0, Math.min(255, Math.round(component)))
    .toString(16)
    .padStart(2, '0');
}

function hexToRgb(value: string): RGB | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function PixelArtControls({
  settings,
  onChange,
  sourceImage,
  eyedropperEnabled,
  onToggleEyedropper,
}: PixelArtControlsProps) {
  const updateWidth = (raw: number) => {
    const width = clampDimension(raw);
    if (settings.lockAspectRatio && sourceImage) {
      onChange({
        ...settings,
        targetWidth: width,
        targetHeight: deriveLockedHeight(width, sourceImage),
      });
      return;
    }
    onChange({ ...settings, targetWidth: width });
  };

  const updateHeight = (raw: number) => {
    const height = clampDimension(raw);
    if (settings.lockAspectRatio && sourceImage) {
      onChange({
        ...settings,
        targetHeight: height,
        targetWidth: deriveLockedWidth(height, sourceImage),
      });
      return;
    }
    onChange({ ...settings, targetHeight: height });
  };

  const toggleLock = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    if (enabled && sourceImage) {
      onChange({
        ...settings,
        lockAspectRatio: true,
        targetHeight: deriveLockedHeight(settings.targetWidth, sourceImage),
      });
      return;
    }
    onChange({ ...settings, lockAspectRatio: enabled });
  };

  const applyPreset = (preset: number) => {
    const width = clampDimension(preset);
    if (settings.lockAspectRatio && sourceImage) {
      onChange({
        ...settings,
        targetWidth: width,
        targetHeight: deriveLockedHeight(width, sourceImage),
      });
      return;
    }
    onChange({ ...settings, targetWidth: width, targetHeight: width });
  };

  const toggleEdgeEnhancement = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, edgeEnhancementEnabled: event.target.checked });
  };

  const setEdgeStrength = (raw: number) => {
    const value = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
    onChange({ ...settings, edgeEnhancementStrength: value });
  };

  const setEdgeMode = (mode: EdgeEnhancementMode) => {
    onChange({ ...settings, edgeEnhancementMode: mode });
  };

  const toggleProtectAlphaEdges = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, protectAlphaEdges: event.target.checked });
  };

  const toggleChromaKey = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, chromaKeyEnabled: event.target.checked });
  };

  const setChromaKeyColor = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    onChange({ ...settings, chromaKeyColor: rgb });
  };

  const setChromaKeyTolerance = (raw: number) => {
    onChange({ ...settings, chromaKeyTolerance: clampPercent(raw) });
  };

  const setChromaKeySoftness = (raw: number) => {
    onChange({ ...settings, chromaKeySoftness: clampPercent(raw) });
  };

  const setChromaKeySpillSuppression = (raw: number) => {
    onChange({ ...settings, chromaKeySpillSuppression: clampPercent(raw) });
  };

  const toggleProtectEdges = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, chromaKeyProtectEdges: event.target.checked });
  };

  const setDithering = (dithering: PixelArtDitheringMode) => {
    onChange({ ...settings, dithering });
  };

  const presetActive = (preset: number) =>
    settings.targetWidth === preset &&
    (settings.lockAspectRatio ? true : settings.targetHeight === preset);

  return (
    <div style={styles.section}>
      <div style={styles.group}>
        <span style={styles.groupTitle}>Background Removal</span>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={settings.chromaKeyEnabled}
            onChange={toggleChromaKey}
          />
          Enable chroma key
        </label>
        <div
          style={{
            ...styles.row,
            ...(settings.chromaKeyEnabled ? {} : styles.disabled),
          }}
        >
          <label htmlFor="pa-ck-color" style={styles.label}>
            Key color
          </label>
          <input
            id="pa-ck-color"
            type="color"
            value={rgbToHex(settings.chromaKeyColor)}
            onChange={(event) => setChromaKeyColor(event.target.value)}
            disabled={!settings.chromaKeyEnabled}
            style={styles.colorInput}
          />
        </div>
        <button
          type="button"
          onClick={onToggleEyedropper}
          disabled={!sourceImage}
          style={{
            ...styles.eyedropperButton,
            ...(eyedropperEnabled ? styles.eyedropperButtonActive : {}),
            ...(!sourceImage ? styles.eyedropperButtonDisabled : {}),
          }}
          title={
            !sourceImage
              ? 'Load a PNG to pick a key color'
              : 'Click then sample a pixel on the source image'
          }
        >
          {eyedropperEnabled ? 'Click image to pick...' : 'Pick Key Color'}
        </button>
        <details style={styles.advanced}>
          <summary style={styles.advancedSummary}>Advanced key controls</summary>
          <div style={styles.advancedBody}>
            <RangeRow
              id="pa-ck-tolerance"
              label="Tolerance"
              value={settings.chromaKeyTolerance}
              min={0}
              max={100}
              step={1}
              disabled={!settings.chromaKeyEnabled}
              onChange={setChromaKeyTolerance}
            />
            <RangeRow
              id="pa-ck-softness"
              label="Softness"
              value={settings.chromaKeySoftness}
              min={0}
              max={100}
              step={1}
              disabled={!settings.chromaKeyEnabled}
              onChange={setChromaKeySoftness}
            />
            <RangeRow
              id="pa-ck-spill"
              label="Spill"
              value={settings.chromaKeySpillSuppression}
              min={0}
              max={100}
              step={1}
              disabled={!settings.chromaKeyEnabled}
              onChange={setChromaKeySpillSuppression}
            />
            <label
              style={{
                ...styles.checkboxRow,
                ...(settings.chromaKeyEnabled ? {} : styles.disabled),
              }}
            >
              <input
                type="checkbox"
                checked={settings.chromaKeyProtectEdges}
                onChange={toggleProtectEdges}
                disabled={!settings.chromaKeyEnabled}
              />
              Protect edges
            </label>
            <span style={styles.hint}>
              Chroma key runs before resize and palette extraction.
            </span>
          </div>
        </details>
      </div>

      <div style={styles.group}>
        <span style={styles.groupTitle}>Target Resolution</span>
        <div style={styles.row}>
          <label htmlFor="pa-target-width" style={styles.label}>
            Width (px)
          </label>
          <input
            id="pa-target-width"
            type="number"
            min={1}
            max={1024}
            step={1}
            value={settings.targetWidth}
            onChange={(event) => updateWidth(Number(event.target.value))}
            style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <label htmlFor="pa-target-height" style={styles.label}>
            Height (px)
          </label>
          <input
            id="pa-target-height"
            type="number"
            min={1}
            max={1024}
            step={1}
            value={settings.targetHeight}
            onChange={(event) => updateHeight(Number(event.target.value))}
            style={styles.input}
          />
        </div>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={settings.lockAspectRatio}
            onChange={toggleLock}
          />
          Lock aspect ratio
        </label>
        {settings.lockAspectRatio && !sourceImage && (
          <span style={styles.hint}>
            Load a PNG to lock to the source aspect ratio.
          </span>
        )}
        <div style={styles.pillGroup}>
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              style={{
                ...styles.pill,
                ...(presetActive(preset) ? styles.pillActive : {}),
              }}
              onClick={() => applyPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.group}>
        <span style={styles.groupTitle}>Edge Enhancement</span>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={settings.edgeEnhancementEnabled}
            onChange={toggleEdgeEnhancement}
          />
          Enable edge enhancement
        </label>
        <RangeRow
          id="pa-edge-strength"
          label="Strength"
          value={settings.edgeEnhancementStrength}
          min={0}
          max={1}
          step={0.05}
          suffix="%"
          displayValue={Math.round(settings.edgeEnhancementStrength * 100)}
          disabled={!settings.edgeEnhancementEnabled}
          onChange={setEdgeStrength}
        />
        <details style={styles.advanced}>
          <summary style={styles.advancedSummary}>
            Advanced edge controls
          </summary>
          <div style={styles.advancedBody}>
            <div
              style={{
                ...styles.row,
                ...(settings.edgeEnhancementEnabled ? {} : styles.disabled),
              }}
            >
              <label htmlFor="pa-edge-mode" style={styles.label}>
                Mode
              </label>
              <select
                id="pa-edge-mode"
                value={settings.edgeEnhancementMode}
                onChange={(event) =>
                  setEdgeMode(event.target.value as EdgeEnhancementMode)
                }
                disabled={!settings.edgeEnhancementEnabled}
                style={styles.select}
              >
                <option value="subtle">Subtle</option>
                <option value="strong">Strong</option>
              </select>
            </div>
            <label
              style={{
                ...styles.checkboxRow,
                ...(settings.edgeEnhancementEnabled ? {} : styles.disabled),
              }}
            >
              <input
                type="checkbox"
                checked={settings.protectAlphaEdges}
                onChange={toggleProtectAlphaEdges}
                disabled={!settings.edgeEnhancementEnabled}
              />
              Protect alpha edges
            </label>
          </div>
        </details>
      </div>

      <div style={styles.group}>
        <span style={styles.groupTitle}>Dithering</span>
        <div style={styles.row}>
          <label htmlFor="pa-dithering" style={styles.label}>
            Mode
          </label>
          <select
            id="pa-dithering"
            value={settings.dithering}
            onChange={(event) =>
              setDithering(event.target.value as PixelArtDitheringMode)
            }
            style={styles.select}
          >
            <option value="none">None</option>
            <option value="ordered">Ordered</option>
            <option value="floyd-steinberg">Floyd-Steinberg</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface RangeRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
  displayValue?: number;
  suffix?: string;
}

function RangeRow({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  displayValue = value,
  suffix = '',
}: RangeRowProps) {
  return (
    <div style={{ ...styles.row, ...(disabled ? styles.disabled : {}) }}>
      <label htmlFor={id} style={styles.label}>
        {label}
      </label>
      <div style={styles.rangeRow}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
          style={styles.range}
        />
        <span style={styles.rangeValue}>
          {displayValue}
          {suffix}
        </span>
      </div>
    </div>
  );
}
