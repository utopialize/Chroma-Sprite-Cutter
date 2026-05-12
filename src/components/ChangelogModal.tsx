import { useEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { APP_VERSION, CHANGELOG, REPO_URL } from '../changelog';
import { colors, fontFamily, fontSize, radii, spacing } from '../theme';

export interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'grid',
    placeItems: 'center',
    padding: spacing.xl,
    zIndex: 50,
    fontFamily,
  },
  modal: {
    width: 'min(620px, 100%)',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.bgPanel,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.55)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.lg}px ${spacing.xl}px`,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanelLight,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
  },
  closeButton: {
    width: 32,
    height: 32,
    padding: 0,
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    borderRadius: radii.sm,
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: `${spacing.lg}px ${spacing.xl}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
  },
  entry: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  entryVersion: {
    margin: 0,
    fontSize: fontSize.sm,
    fontWeight: 700,
    color: colors.textPrimary,
    fontVariantNumeric: 'tabular-nums',
  },
  entryDate: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
  },
  entryList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  entryItem: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 1.5,
    paddingLeft: spacing.lg,
    position: 'relative',
  },
  bullet: {
    position: 'absolute',
    left: 4,
    top: 7,
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentHi,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.md}px ${spacing.xl}px`,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanelLight,
    gap: spacing.md,
  },
  repoLink: {
    color: colors.accentHi,
    fontSize: fontSize.xs,
    fontWeight: 600,
    textDecoration: 'none',
  },
  doneButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
};

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
    >
      <div style={styles.modal}>
        <header style={styles.header}>
          <div style={styles.titleBlock}>
            <h2 id="changelog-title" style={styles.title}>
              What's new
            </h2>
            <span style={styles.subtitle}>
              Currently running v{APP_VERSION}
            </span>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close changelog"
          >
            x
          </button>
        </header>
        <div style={styles.body}>
          {CHANGELOG.map((entry) => (
            <section key={entry.version} style={styles.entry}>
              <div style={styles.entryHeader}>
                <h3 style={styles.entryVersion}>v{entry.version}</h3>
                <span style={styles.entryDate}>{entry.date}</span>
              </div>
              <ul style={styles.entryList}>
                {entry.highlights.map((highlight, index) => (
                  <li key={index} style={styles.entryItem}>
                    <span style={styles.bullet} aria-hidden />
                    {highlight}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer style={styles.footer}>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            style={styles.repoLink}
          >
            View source on GitHub
          </a>
          <button type="button" style={styles.doneButton} onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
