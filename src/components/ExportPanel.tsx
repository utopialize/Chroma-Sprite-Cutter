import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { getActiveAnimation } from '../lib/animationClips';
import {
  buildZipContentSummary,
  exportAnimationGif,
  exportIndividualFrames,
  exportProjectZip,
  exportSpriteSheetMetadata,
  exportTransparentPng,
  getMetadataPresetLabel,
  sanitizeFileBaseName,
} from '../lib/imageIO';
import { METADATA_PRESETS } from '../types/export';
import type { ExportOptions, MetadataPreset } from '../types/export';
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
  hint: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.4,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
    padding: '9px 10px',
    fontSize: fontSize.xs,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
    padding: '9px 10px',
    fontSize: fontSize.xs,
  },
  summary: {
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  summaryTitle: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingTop: spacing.xs,
    borderTop: `1px solid ${colors.border}`,
  },
  summaryName: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontVariantNumeric: 'tabular-nums',
    overflowWrap: 'anywhere',
  },
  summaryDetail: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.35,
  },
};

export function ExportPanel({
  image,
  settings,
  spriteSheetSettings,
}: ExportPanelProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileBaseName, setFileBaseName] = useState('');
  const [metadataPreset, setMetadataPreset] =
    useState<MetadataPreset>('generic');
  const activeAnimation = getActiveAnimation(spriteSheetSettings);

  useEffect(() => {
    setFileBaseName(image ? sanitizeFileBaseName(image.name) : '');
  }, [image]);

  const exportOptions: ExportOptions = {
    fileBaseName,
    metadataPreset,
  };
  const zipSummary = useMemo(
    () =>
      image
        ? buildZipContentSummary(image.name, spriteSheetSettings, exportOptions)
        : [],
    [exportOptions, image, spriteSheetSettings],
  );

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
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel} htmlFor="export-file-name">
          File base name
        </label>
        <input
          id="export-file-name"
          type="text"
          value={fileBaseName}
          disabled={disabled}
          style={{
            ...styles.input,
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onChange={(event) => setFileBaseName(event.target.value)}
          placeholder="hero_run"
        />
        <span style={styles.hint}>
          Files use this base name, sanitized at export time.
        </span>
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel} htmlFor="metadata-preset">
          Metadata preset
        </label>
        <select
          id="metadata-preset"
          value={metadataPreset}
          disabled={disabled}
          style={{
            ...styles.select,
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onChange={(event) =>
            setMetadataPreset(event.target.value as MetadataPreset)
          }
        >
          {METADATA_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {getMetadataPresetLabel(preset)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={disabled}
        style={buttonStyle}
        onClick={() =>
          void runExport('png', (loadedImage) =>
            exportTransparentPng(
              loadedImage,
              settings,
              spriteSheetSettings,
              exportOptions,
            ),
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
              exportOptions,
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
              exportIndividualFrames(
                loadedImage,
                settings,
                spriteSheetSettings,
                exportOptions,
              ),
            )
          }
        >
          {busyAction === 'frames' ? 'Exporting...' : 'Export individual frames'}
        </button>
      )}
      {spriteSheetSettings.enabled && (
        <button
          type="button"
          disabled={disabled}
          style={secondaryButtonStyle}
          onClick={() =>
            void runExport('gif', (loadedImage) =>
              exportAnimationGif(
                loadedImage,
                settings,
                spriteSheetSettings,
                {},
                exportOptions,
              ),
            )
          }
        >
          {busyAction === 'gif' ? 'Encoding GIF...' : 'Export animation GIF'}
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        style={secondaryButtonStyle}
        onClick={() =>
          void runExport('zip', (loadedImage) =>
            exportProjectZip(
              loadedImage,
              settings,
              spriteSheetSettings,
              exportOptions,
            ),
          )
        }
      >
        {busyAction === 'zip' ? 'Packaging ZIP...' : 'Export ZIP package'}
      </button>
      <div style={styles.summary}>
        <span style={styles.summaryTitle}>ZIP contents</span>
        {zipSummary.length === 0 ? (
          <span style={styles.summaryDetail}>Load an image to preview package contents.</span>
        ) : (
          zipSummary.map((item) => (
            <div key={item.name} style={styles.summaryItem}>
              <span style={styles.summaryName}>{item.name}</span>
              <span style={styles.summaryDetail}>{item.detail}</span>
            </div>
          ))
        )}
      </div>
      {spriteSheetSettings.enabled && (
        <span style={styles.hint}>
          GIF uses the active clip: {activeAnimation.name}, {activeAnimation.fps} FPS.
        </span>
      )}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}
