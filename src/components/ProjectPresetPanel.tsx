import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import {
  downloadProjectPreset,
  readProjectPresetFile,
} from '../lib/presets';
import type { ChromaKeySettings } from '../types/image';
import type { SpriteSheetSettings } from '../types/spriteSheet';
import { colors, fontSize, radii, spacing } from '../theme';

export interface ProjectPresetPanelProps {
  chromaKey: ChromaKeySettings;
  spriteSheet: SpriteSheetSettings;
  onLoad: (preset: {
    chromaKey: ChromaKeySettings;
    spriteSheet: SpriteSheetSettings;
  }) => void;
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
  row: {
    display: 'flex',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    padding: '9px 10px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    borderRadius: radii.md,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
  },
  help: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.45,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.xxs,
  },
  hidden: { display: 'none' },
};

export function ProjectPresetPanel({
  chromaKey,
  spriteSheet,
  onLoad,
}: ProjectPresetPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    try {
      downloadProjectPreset(chromaKey, spriteSheet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const preset = await readProjectPresetFile(file);
      onLoad({
        chromaKey: preset.chromaKey,
        spriteSheet: preset.spriteSheet,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>Project preset</span>
      <div style={styles.row}>
        <button type="button" style={styles.button} onClick={handleSave}>
          Save project
        </button>
        <button
          type="button"
          style={styles.button}
          onClick={() => inputRef.current?.click()}
        >
          Load project
        </button>
      </div>
      <span style={styles.help}>
        Saves mask and sheet settings together. Mask-only presets still load
        from Clean Background.
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => void handleLoad(event)}
        style={styles.hidden}
      />
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}
