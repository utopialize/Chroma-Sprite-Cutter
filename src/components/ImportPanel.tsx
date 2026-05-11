import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent } from 'react';
import type { LoadedImage } from '../types/image';
import { colors, fontSize, radii, spacing } from '../theme';

export interface ImportPanelProps {
  image: LoadedImage | null;
  onImport: (image: LoadedImage | null) => void;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  label: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  drop: {
    padding: '32px 12px',
    border: `1px dashed ${colors.borderInputHover}`,
    borderRadius: radii.md,
    textAlign: 'center',
    cursor: 'pointer',
    color: colors.textMuted,
    backgroundColor: colors.bgInput,
    fontSize: fontSize.xs,
    userSelect: 'none',
  },
  dropActive: {
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
  file: {
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
  hidden: { display: 'none' },
};

function isPng(file: File): boolean {
  return (
    file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
  );
}

function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        element: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        name: file.name,
        size: file.size,
        type: file.type || 'image/png',
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

export function ImportPanel({ image, onImport }: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!isPng(file)) {
      setError('PNG files only');
      return;
    }
    setError(null);
    try {
      const loaded = await loadImage(file);
      onImport(loaded);
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
    ...styles.drop,
    ...(isDragging ? styles.dropActive : {}),
  };

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>Source</span>
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
        <div style={styles.file}>
          <span style={styles.fileName} title={image.name}>
            {image.name}
          </span>
          <span style={styles.fileMeta}>
            {image.width} × {image.height} px
          </span>
        </div>
      )}
    </div>
  );
}
