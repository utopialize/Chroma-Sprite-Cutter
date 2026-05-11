import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { SPRITESHEET_TEMPLATES } from '../lib/spriteSheetTemplates';
import type {
  SpriteSheetAnchor,
  SpriteSheetFitMode,
  SpriteSheetSettings,
} from '../types/spriteSheet';
import { colors, fontSize, radii, spacing } from '../theme';

export interface SpriteSheetPanelProps {
  settings: SpriteSheetSettings;
  onChange: (settings: SpriteSheetSettings) => void;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: spacing.xl,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  section: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: colors.accentHi,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  disabled: {
    opacity: 0.48,
  },
  help: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.45,
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
  },
  modeButton: {
    padding: '10px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentHi,
    color: '#ffffff',
  },
  modeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
  },
  templateButton: {
    minHeight: 54,
    padding: spacing.md,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    textAlign: 'left',
  },
  templateTitle: {
    display: 'block',
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  templateDescription: {
    display: 'block',
    marginTop: 3,
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    lineHeight: 1.35,
  },
  frameToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  frameCount: {
    flex: 1,
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
  },
  compactButton: {
    padding: '6px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: fontSize.xxs,
    fontWeight: 600,
  },
  frameGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: spacing.sm,
  },
  frameToggle: {
    minHeight: 30,
    display: 'grid',
    placeItems: 'center',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textFaint,
    cursor: 'pointer',
    fontSize: fontSize.xxs,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  frameToggleActive: {
    borderColor: colors.accentHi,
    backgroundColor: colors.accent,
    color: '#ffffff',
  },
};

export function SpriteSheetPanel({
  settings,
  onChange,
}: SpriteSheetPanelProps) {
  const update = <K extends keyof SpriteSheetSettings>(
    key: K,
    value: SpriteSheetSettings[K],
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const updateNumber =
    (key: NumberKey, min: number, max: number) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      const value = Number.isFinite(parsed) ? parsed : min;
      update(key, Math.max(min, Math.min(max, Math.round(value))));
    };

  const contentStyle: CSSProperties = settings.enabled ? {} : styles.disabled;
  const sourceFrameCount = settings.sourceColumns * settings.sourceRows;
  const excluded = new Set(settings.excludedSourceFrameIndices);
  const includedCount = Math.max(0, sourceFrameCount - excluded.size);

  const setExcludedFrames = (excludedSourceFrameIndices: number[]) => {
    onChange({ ...settings, excludedSourceFrameIndices });
  };

  const toggleSourceFrame = (sourceIndex: number) => {
    const next = new Set(settings.excludedSourceFrameIndices);
    if (next.has(sourceIndex)) next.delete(sourceIndex);
    else next.add(sourceIndex);
    setExcludedFrames([...next].sort((a, b) => a - b));
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.section}>Sprite Sheet</span>
      <label style={styles.toggleRow}>
        <span>Build regular output sheet</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => update('enabled', event.target.checked)}
          style={styles.checkbox}
        />
      </label>

      <div style={contentStyle}>
        <span style={styles.section}>Templates</span>
        <div style={styles.templateGrid}>
          {SPRITESHEET_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={!settings.enabled}
              style={{
                ...styles.templateButton,
                ...(!settings.enabled ? styles.modeButtonDisabled : {}),
              }}
              title={template.description}
              onClick={() =>
                onChange({
                  ...settings,
                  ...template.settings,
                  excludedSourceFrameIndices: [],
                })
              }
            >
              <span style={styles.templateTitle}>{template.label}</span>
              <span style={styles.templateDescription}>
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={contentStyle}>
        <span style={styles.section}>Extraction mode</span>
        <div style={styles.modeGrid}>
          <button
            type="button"
            disabled={!settings.enabled}
            style={{
              ...styles.modeButton,
              ...styles.modeButtonActive,
              ...(!settings.enabled ? styles.modeButtonDisabled : {}),
            }}
            onClick={() => update('extractionMode', 'source-grid')}
          >
            Source Grid
          </button>
          <button
            type="button"
            disabled
            style={{ ...styles.modeButton, ...styles.modeButtonDisabled }}
            title="Auto-detect will be added after the source grid workflow is stable"
          >
            Auto-detect
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        <span style={styles.section}>Frame selection</span>
        <div style={styles.frameToolbar}>
          <span style={styles.frameCount}>
            {includedCount} / {sourceFrameCount} included
          </span>
          <button
            type="button"
            disabled={!settings.enabled}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled ? styles.modeButtonDisabled : {}),
            }}
            onClick={() => setExcludedFrames([])}
          >
            Include all
          </button>
          <button
            type="button"
            disabled={!settings.enabled}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled ? styles.modeButtonDisabled : {}),
            }}
            onClick={() =>
              setExcludedFrames(
                Array.from({ length: sourceFrameCount }, (_, index) => index),
              )
            }
          >
            Clear all
          </button>
        </div>
        <div style={styles.frameGrid}>
          {Array.from({ length: sourceFrameCount }, (_, sourceIndex) => {
            const included = !excluded.has(sourceIndex);
            return (
              <button
                key={sourceIndex}
                type="button"
                disabled={!settings.enabled}
                style={{
                  ...styles.frameToggle,
                  ...(included ? styles.frameToggleActive : {}),
                  ...(!settings.enabled ? styles.modeButtonDisabled : {}),
                }}
                aria-pressed={included}
                title={
                  included
                    ? `Frame ${sourceIndex + 1} included`
                    : `Frame ${sourceIndex + 1} excluded`
                }
                onClick={() => toggleSourceFrame(sourceIndex)}
              >
                {sourceIndex + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div style={contentStyle}>
        <span style={styles.section}>Source grid</span>
        <div style={styles.grid}>
          <NumberField
            label="Columns"
            min={1}
            max={64}
            value={settings.sourceColumns}
            disabled={!settings.enabled}
            onChange={updateNumber('sourceColumns', 1, 64)}
          />
          <NumberField
            label="Rows"
            min={1}
            max={64}
            value={settings.sourceRows}
            disabled={!settings.enabled}
            onChange={updateNumber('sourceRows', 1, 64)}
          />
          <NumberField
            label="Margin X"
            min={0}
            max={4096}
            value={settings.sourceMarginX}
            disabled={!settings.enabled}
            onChange={updateNumber('sourceMarginX', 0, 4096)}
          />
          <NumberField
            label="Margin Y"
            min={0}
            max={4096}
            value={settings.sourceMarginY}
            disabled={!settings.enabled}
            onChange={updateNumber('sourceMarginY', 0, 4096)}
          />
          <NumberField
            label="Gap X"
            min={0}
            max={4096}
            value={settings.sourceGapX}
            disabled={!settings.enabled}
            onChange={updateNumber('sourceGapX', 0, 4096)}
          />
          <NumberField
            label="Gap Y"
            min={0}
            max={4096}
            value={settings.sourceGapY}
            disabled={!settings.enabled}
            onChange={updateNumber('sourceGapY', 0, 4096)}
          />
        </div>
      </div>

      <div style={contentStyle}>
        <span style={styles.section}>Output grid</span>
        <div style={styles.grid}>
          <NumberField
            label="Columns"
            min={1}
            max={64}
            value={settings.outputColumns}
            disabled={!settings.enabled}
            onChange={updateNumber('outputColumns', 1, 64)}
          />
          <NumberField
            label="Rows"
            min={1}
            max={64}
            value={settings.outputRows}
            disabled={!settings.enabled}
            onChange={updateNumber('outputRows', 1, 64)}
          />
          <NumberField
            label="Frame W"
            min={1}
            max={4096}
            value={settings.frameWidth}
            disabled={!settings.enabled}
            onChange={updateNumber('frameWidth', 1, 4096)}
          />
          <NumberField
            label="Frame H"
            min={1}
            max={4096}
            value={settings.frameHeight}
            disabled={!settings.enabled}
            onChange={updateNumber('frameHeight', 1, 4096)}
          />
          <NumberField
            label="Padding"
            min={0}
            max={1024}
            value={settings.padding}
            disabled={!settings.enabled}
            onChange={updateNumber('padding', 0, 1024)}
          />
          <NumberField
            label="Alpha"
            min={0}
            max={255}
            value={settings.alphaThreshold}
            disabled={!settings.enabled}
            onChange={updateNumber('alphaThreshold', 0, 255)}
          />
          <SelectField
            label="Fit"
            value={settings.fitMode}
            disabled={!settings.enabled}
            onChange={(event) =>
              update('fitMode', event.target.value as SpriteSheetFitMode)
            }
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="original">Original</option>
          </SelectField>
          <SelectField
            label="Anchor"
            value={settings.anchor}
            disabled={!settings.enabled}
            onChange={(event) =>
              update('anchor', event.target.value as SpriteSheetAnchor)
            }
          >
            <option value="center">Center</option>
            <option value="bottom-center">Bottom center</option>
            <option value="top-center">Top center</option>
          </SelectField>
        </div>
      </div>

      <span style={styles.help}>
        Processed preview and export use the rebuilt sheet while this mode is
        enabled.
      </span>
    </div>
  );
}

type NumberKey = {
  [K in keyof SpriteSheetSettings]: SpriteSheetSettings[K] extends number
    ? K
    : never;
}[keyof SpriteSheetSettings];

interface NumberFieldProps {
  label: string;
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function NumberField({
  label,
  min,
  max,
  value,
  disabled,
  onChange,
}: NumberFieldProps) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={onChange}
        style={styles.input}
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}

function SelectField({
  label,
  value,
  disabled,
  onChange,
  children,
}: SelectFieldProps) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={onChange}
        style={styles.input}
      >
        {children}
      </select>
    </label>
  );
}
