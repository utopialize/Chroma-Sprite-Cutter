import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent } from 'react';
import { colors, fontSize, radii, spacing } from '../../../theme';
import { isPngFile, loadPngFromFile } from '../../../shared/lib/imageIO';
import type { PixelArtSourceImage } from '../types';

interface PixelArtImportPanelProps {
  image: PixelArtSourceImage | null;
  onImport: (image: PixelArtSourceImage) => void;
}

const styles: Record<string, CSSProperties> = {
  section: {
    padding: `${spacing.lg}px ${spacing.xl}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  sectionTitle: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  dropZone: {
    border: `1px dashed ${colors.borderInputHover}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    padding: '20px 12px',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 1.5,
    cursor: 'pointer',
    userSelect: 'none',
  },
  dropZoneActive: {
    borderColor: colors.accentHi,
    backgroundColor: '#1f2733',
    color: colors.textSecondary,
  },
  button: {
    padding: '8px 12px',
    backgroundColor: colors.bgRaised,
    border: `1px solid ${colors.borderInputHover}`,
    color: colors.textPrimary,
    borderRadius: radii.md,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 500,
  },
  hidden: { display: 'none' },
  fileCard: {
    padding: spacing.md + 2,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    backgroundColor: colors.bgInput,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    fontSize: fontSize.xxs,
    color: colors.textFaint,
    fontVariantNumeric: 'tabular-nums',
  },
  error: {
    fontSize: fontSize.xxs,
    color: colors.danger,
  },
  hint: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    lineHeight: 1.5,
  },
};

export function PixelArtImportPanel({ image, onImport }: PixelArtImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!isPngFile(file)) {
      setError('PNG files only');
      return;
    }
    setError(null);
    try {
      const loaded = await loadPngFromFile(file);
      onImport({
        element: loaded.element,
        name: loaded.name,
        width: loaded.width,
        height: loaded.height,
      });
    } catch {
      setError('Failed to load image');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const dropStyle: CSSProperties = {
    ...styles.dropZone,
    ...(isDragging ? styles.dropZoneActive : {}),
  };

  return (
    <div style={styles.section}>
      <span style={styles.sectionTitle}>Import</span>
      <div
        style={dropStyle}
        onClick={openPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openPicker();
        }}
      >
        {isDragging ? 'Drop the PNG' : 'Drag & drop a PNG here'}
      </div>
      <button type="button" onClick={openPicker} style={styles.button}>
        Choose PNG
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        onChange={handleChange}
        style={styles.hidden}
      />
      {error && <span style={styles.error}>{error}</span>}
      {image && (
        <div style={styles.fileCard}>
          <span style={styles.fileName} title={image.name}>
            {image.name}
          </span>
          <span style={styles.fileMeta}>
            {image.width} × {image.height} px
          </span>
        </div>
      )}
      <span style={styles.hint}>
        Pixel art conversion will run locally once a source image is loaded.
      </span>
    </div>
  );
}
