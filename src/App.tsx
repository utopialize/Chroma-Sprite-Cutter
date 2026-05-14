import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ChangelogModal } from './components/ChangelogModal';
import { APP_VERSION, REPO_URL } from './changelog';
import { BackgroundRemoverTool } from './tools/background-remover/BackgroundRemoverTool';
import { PixelArtConverterTool } from './tools/pixel-art-converter/PixelArtConverterTool';
import { colors, fontFamily, fontSize, radii, spacing } from './theme';

type ToolId = 'background-remover' | 'pixel-art-converter';

interface ToolDef {
  id: ToolId;
  label: string;
  hint: string;
}

const TOOLS: ToolDef[] = [
  {
    id: 'background-remover',
    label: 'Background Remover',
    hint: 'Local PNG cleanup and sheet builder',
  },
  {
    id: 'pixel-art-converter',
    label: 'Pixel Art Converter',
    hint: 'Convert images to pixel art',
  },
];

const styles: Record<string, CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: colors.bgApp,
    color: colors.textPrimary,
    fontFamily,
    fontSize: fontSize.sm,
    overflow: 'hidden',
  },
  topBar: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xxl,
    padding: `${spacing.md}px ${spacing.xxl}px`,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanel,
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  brandTitle: {
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: 0,
  },
  brandSubtitle: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  toolNav: {
    display: 'flex',
    gap: spacing.sm,
    marginLeft: spacing.lg,
  },
  toolButton: {
    padding: '8px 14px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: colors.bgInput,
    color: colors.textMuted,
    borderRadius: radii.pill,
    fontSize: fontSize.xs,
    fontWeight: 600,
    cursor: 'pointer',
  },
  toolButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentHi,
    color: '#ffffff',
  },
  versionGroup: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  versionButton: {
    padding: '5px 10px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    borderRadius: radii.pill,
    cursor: 'pointer',
    fontSize: fontSize.xxs,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0.3,
  },
  repoLink: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: 600,
    textDecoration: 'none',
    padding: '5px 8px',
    borderRadius: radii.sm,
  },
  toolContainer: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
};

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('background-remover');
  const [changelogOpen, setChangelogOpen] = useState(false);

  const currentTool = TOOLS.find((tool) => tool.id === activeTool) ?? TOOLS[0];

  return (
    <div style={styles.app}>
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <span style={styles.brandTitle}>Chroma Sprite Cutter</span>
          <span style={styles.brandSubtitle}>{currentTool.hint}</span>
        </div>
        <nav style={styles.toolNav} aria-label="Tools">
          {TOOLS.map((tool) => {
            const active = tool.id === activeTool;
            return (
              <button
                key={tool.id}
                type="button"
                style={{
                  ...styles.toolButton,
                  ...(active ? styles.toolButtonActive : {}),
                }}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.label}
              </button>
            );
          })}
        </nav>
        <div style={styles.versionGroup}>
          <button
            type="button"
            style={styles.versionButton}
            onClick={() => setChangelogOpen(true)}
            title="View changelog"
          >
            v{APP_VERSION}
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            style={styles.repoLink}
            title="Open the project on GitHub"
          >
            GitHub ↗
          </a>
        </div>
      </div>

      <div style={styles.toolContainer}>
        {activeTool === 'background-remover' && <BackgroundRemoverTool />}
        {activeTool === 'pixel-art-converter' && <PixelArtConverterTool />}
      </div>

      <ChangelogModal
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </div>
  );
}
