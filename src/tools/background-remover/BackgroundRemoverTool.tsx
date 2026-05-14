import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimationPreviewPanel } from '../../components/AnimationPreviewPanel';
import { BackgroundPreviewSelector } from '../../components/BackgroundPreviewSelector';
import { ControlsPanel } from '../../components/ControlsPanel';
import { ExportPanel } from '../../components/ExportPanel';
import { ImportPanel } from '../../components/ImportPanel';
import { PreviewCanvas } from '../../components/PreviewCanvas';
import { ProjectPresetPanel } from '../../components/ProjectPresetPanel';
import { SpriteSheetPanel } from '../../components/SpriteSheetPanel';
import { autoDetectKeyColor } from '../../lib/colorUtils';
import { getEffectiveManualFrames } from '../../lib/manualFrames';
import { DEFAULT_SPRITESHEET_SETTINGS } from '../../lib/spriteSheet';
import { validateSpriteSheetSettings } from '../../lib/spriteSheetValidation';
import { formatZoom, stepZoom } from '../../lib/zoom';
import type {
  ChromaKeySettings,
  LoadedImage,
  PreviewBackground,
  RGB,
  SpriteSheetPreviewMode,
  ViewMode,
  Zoom,
} from '../../types/image';
import type { SpriteSheetDiagnostic } from '../../types/spriteSheet';
import { colors, fontSize, radii, spacing } from '../../theme';

type WorkflowStep = 'import' | 'clean' | 'build' | 'export';

interface StepDef {
  id: WorkflowStep;
  title: string;
  detail: string;
}

const STEPS: StepDef[] = [
  { id: 'import', title: 'Import', detail: 'Load your image' },
  { id: 'clean', title: 'Clean Background', detail: 'Tune the mask' },
  { id: 'build', title: 'Build Sprite Sheet', detail: 'Align frames' },
  { id: 'export', title: 'Export', detail: 'Save output' },
];

const DEFAULT_SETTINGS: ChromaKeySettings = {
  keyColor: { r: 0, g: 255, b: 0 },
  tolerance: 30,
  softness: 25,
  spillSuppression: 50,
  edgeCleanup: 0,
  preserveDetails: 50,
};

const CLEAN_VIEW_MODES: { value: ViewMode; label: string; hotkey: string }[] = [
  { value: 'original', label: 'Original', hotkey: 'O' },
  { value: 'processed', label: 'Processed', hotkey: 'P' },
  { value: 'split', label: 'Split', hotkey: 'S' },
  { value: 'alpha', label: 'Alpha mask', hotkey: 'A' },
];

const SHEET_VIEW_MODES: { value: SpriteSheetPreviewMode; label: string }[] = [
  { value: 'sheet-source', label: 'Source overlay' },
  { value: 'sheet-extracted', label: 'Extracted frames' },
  { value: 'sheet-final', label: 'Final sheet' },
];

const styles: Record<string, CSSProperties> = {
  root: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    minHeight: 84,
    flexShrink: 0,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: spacing.xxl,
    alignItems: 'center',
    padding: `${spacing.md + 2}px ${spacing.xxl}px`,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanel,
  },
  stepper: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: spacing.md,
  },
  step: {
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr)',
    gap: spacing.md,
    alignItems: 'center',
    padding: `${spacing.md}px ${spacing.lg}px`,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    color: colors.textMuted,
    cursor: 'pointer',
    textAlign: 'left',
  },
  stepActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentHi,
    color: '#ffffff',
  },
  stepDisabled: {
    opacity: 0.46,
    cursor: 'not-allowed',
  },
  stepNumber: {
    width: 32,
    height: 32,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.bgRaised,
    color: colors.textSecondary,
    fontWeight: 700,
  },
  stepNumberActive: {
    backgroundColor: '#ffffff',
    color: colors.accent,
  },
  stepTitle: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 700,
    fontSize: fontSize.xs,
  },
  stepDetail: {
    display: 'block',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: fontSize.xxs,
    color: 'inherit',
    opacity: 0.72,
  },
  workspace: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '300px minmax(0, 1fr) 330px',
    minHeight: 0,
  },
  panel: {
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    backgroundColor: colors.bgPanel,
    borderRight: `1px solid ${colors.border}`,
  },
  rightPanel: {
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    backgroundColor: colors.bgPanel,
    borderLeft: `1px solid ${colors.border}`,
  },
  center: {
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
    backgroundColor: colors.bgPanelLight,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  toolbarLabel: {
    color: colors.textFaint,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: spacing.xs,
  },
  pill: {
    padding: '5px 10px',
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
  zoomGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  zoomStep: {
    width: 24,
    height: 24,
    padding: 0,
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    borderRadius: radii.sm,
    cursor: 'pointer',
    fontSize: fontSize.sm,
    lineHeight: 1,
  },
  zoomValue: {
    minWidth: 48,
    textAlign: 'center',
    padding: '4px 8px',
    border: `1px solid ${colors.borderInput}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    borderRadius: radii.sm,
    cursor: 'pointer',
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
  },
  section: {
    padding: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  sectionTitle: {
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fontSize.xxs,
  },
  infoCard: {
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  infoLine: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  infoValue: {
    color: colors.textFaint,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
  diagnosticList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  diagnostic: {
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textSecondary,
    backgroundColor: colors.bgInput,
    fontSize: fontSize.xs,
    lineHeight: 1.35,
  },
  diagnosticError: {
    borderColor: colors.danger,
    color: colors.danger,
  },
  actionRow: {
    display: 'flex',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    padding: '9px 12px',
    border: `1px solid ${colors.borderInputHover}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgRaised,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 600,
  },
  footer: {
    height: 72,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${spacing.xxl}px`,
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanel,
    gap: spacing.lg,
  },
  footerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  footerHint: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footerButtons: {
    display: 'flex',
    gap: spacing.md,
  },
  primaryButton: {
    minWidth: 190,
    padding: '11px 16px',
    border: 'none',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontWeight: 700,
  },
  primaryDisabled: {
    backgroundColor: colors.bgRaised,
    color: colors.textDim,
    cursor: 'not-allowed',
  },
  canvasIntro: {
    padding: `${spacing.lg}px ${spacing.xl}px`,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bgPanelLight,
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
};

export function BackgroundRemoverTool() {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('import');
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [settings, setSettings] = useState<ChromaKeySettings>(DEFAULT_SETTINGS);
  const [spriteSheetSettings, setSpriteSheetSettings] = useState(
    DEFAULT_SPRITESHEET_SETTINGS,
  );
  const [previewBackground, setPreviewBackground] =
    useState<PreviewBackground>('checker');
  const [cleanViewMode, setCleanViewMode] = useState<ViewMode>('processed');
  const [sheetViewMode, setSheetViewMode] =
    useState<SpriteSheetPreviewMode>('sheet-final');
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [eyedropperActive, setEyedropperActive] = useState(false);

  useEffect(() => {
    if (!image) return;
    const detected = autoDetectKeyColor(image.element);
    setSettings((prev) => ({ ...prev, keyColor: detected }));
  }, [image]);

  const zoomIn = useCallback(() => setZoom((prev) => stepZoom(prev, 1)), []);
  const zoomOut = useCallback(() => setZoom((prev) => stepZoom(prev, -1)), []);
  const zoomFit = useCallback(() => setZoom('fit'), []);
  const zoomReset = useCallback(() => setZoom(1), []);
  const toggleEyedropper = useCallback(
    () => setEyedropperActive((v) => !v),
    [],
  );

  const handlePickColor = useCallback((color: RGB) => {
    setSettings((prev) => ({ ...prev, keyColor: color }));
    setEyedropperActive(false);
  }, []);

  const autoTune = useCallback(() => {
    if (!image) return;
    setSettings((prev) => ({
      ...prev,
      keyColor: autoDetectKeyColor(image.element),
    }));
  }, [image]);

  const resetMask = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          zoomFit();
          break;
        case '1':
          event.preventDefault();
          zoomReset();
          break;
        case 'i':
        case 'I':
          if (activeStep === 'clean') {
            event.preventDefault();
            toggleEyedropper();
          }
          break;
        case 'o':
        case 'O':
          if (activeStep === 'clean') setCleanViewMode('original');
          break;
        case 'p':
        case 'P':
          if (activeStep === 'clean') setCleanViewMode('processed');
          break;
        case 's':
        case 'S':
          if (activeStep === 'clean') setCleanViewMode('split');
          break;
        case 'a':
        case 'A':
          if (activeStep === 'clean') setCleanViewMode('alpha');
          break;
        case 'Escape':
          if (eyedropperActive) {
            event.preventDefault();
            setEyedropperActive(false);
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    activeStep,
    zoomIn,
    zoomOut,
    zoomFit,
    zoomReset,
    toggleEyedropper,
    eyedropperActive,
  ]);

  const canLeaveImport = Boolean(image);
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);
  const outputWidth = spriteSheetSettings.enabled
    ? spriteSheetSettings.outputColumns * spriteSheetSettings.frameWidth
    : image?.width ?? 0;
  const outputHeight = spriteSheetSettings.enabled
    ? spriteSheetSettings.outputRows * spriteSheetSettings.frameHeight
    : image?.height ?? 0;
  const outputFrames = spriteSheetSettings.enabled
    ? getEffectiveManualFrames(spriteSheetSettings).length
    : 1;
  const diagnostics = validateSpriteSheetSettings(image, spriteSheetSettings);

  const goToStep = (step: WorkflowStep) => {
    if (step !== 'import' && !canLeaveImport) return;
    setActiveStep(step);
    if (step === 'build') {
      setSpriteSheetSettings((prev) => ({ ...prev, enabled: true }));
      setSheetViewMode('sheet-final');
    }
    if (step !== 'clean') setEyedropperActive(false);
  };

  const goBack = () => {
    const prev = STEPS[Math.max(0, activeIndex - 1)];
    goToStep(prev.id);
  };

  const continuePrimary = () => {
    if (activeStep === 'import') goToStep('clean');
    if (activeStep === 'clean') {
      setSpriteSheetSettings((prev) => ({ ...prev, enabled: true }));
      goToStep('build');
    }
    if (activeStep === 'build') goToStep('export');
  };

  const skipBuild = () => {
    setSpriteSheetSettings((prev) => ({ ...prev, enabled: false }));
    goToStep('export');
  };

  const pillStyle = (active: boolean): CSSProperties => ({
    ...styles.pill,
    ...(active ? styles.pillActive : {}),
  });

  const primaryDisabled = activeStep === 'import' && !canLeaveImport;

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <nav style={styles.stepper} aria-label="Workflow">
          {STEPS.map((step, index) => {
            const active = step.id === activeStep;
            const disabled = step.id !== 'import' && !canLeaveImport;
            const stepStyle: CSSProperties = {
              ...styles.step,
              ...(active ? styles.stepActive : {}),
              ...(disabled ? styles.stepDisabled : {}),
            };
            const numberStyle: CSSProperties = {
              ...styles.stepNumber,
              ...(active ? styles.stepNumberActive : {}),
            };
            return (
              <button
                key={step.id}
                type="button"
                style={stepStyle}
                disabled={disabled}
                onClick={() => goToStep(step.id)}
              >
                <span style={numberStyle}>{index + 1}</span>
                <span>
                  <span style={styles.stepTitle}>{step.title}</span>
                  <span style={styles.stepDetail}>{step.detail}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {activeStep === 'import' && (
        <Workspace
          left={<ImportPanel image={image} onImport={setImage} />}
          center={
            <>
              <div style={styles.canvasIntro}>
                Load a PNG and verify the source dimensions before cleaning.
              </div>
              <PreviewCanvas
                image={image}
                settings={settings}
                previewBackground="checker"
                viewMode="original"
                zoom={zoom}
                onZoomChange={setZoom}
                eyedropperActive={false}
                onPickColor={handlePickColor}
                spriteSheetSettings={{
                  ...spriteSheetSettings,
                  enabled: false,
                }}
              />
            </>
          }
          right={
            <InfoPanel
              image={image}
              settings={settings}
              outputWidth={outputWidth}
              outputHeight={outputHeight}
              outputFrames={outputFrames}
              mode="import"
            />
          }
        />
      )}

      {activeStep === 'clean' && (
        <Workspace
          left={
            <InfoPanel
              image={image}
              settings={settings}
              outputWidth={outputWidth}
              outputHeight={outputHeight}
              outputFrames={outputFrames}
              mode="clean"
            />
          }
          center={
            <>
              <BackgroundPreviewSelector
                value={previewBackground}
                onChange={setPreviewBackground}
              />
              <Toolbar>
                <span style={styles.toolbarLabel}>View</span>
                {CLEAN_VIEW_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    style={pillStyle(cleanViewMode === mode.value)}
                    onClick={() => setCleanViewMode(mode.value)}
                    title={`${mode.label} (${mode.hotkey})`}
                  >
                    {mode.label}
                  </button>
                ))}
                <ZoomControls
                  zoom={zoom}
                  zoomIn={zoomIn}
                  zoomOut={zoomOut}
                  zoomFit={zoomFit}
                  zoomReset={zoomReset}
                  fitActive={zoom === 'fit'}
                  pillStyle={pillStyle}
                />
              </Toolbar>
              <PreviewCanvas
                image={image}
                settings={settings}
                previewBackground={previewBackground}
                viewMode={cleanViewMode}
                zoom={zoom}
                onZoomChange={setZoom}
                eyedropperActive={eyedropperActive}
                onPickColor={handlePickColor}
                spriteSheetSettings={{
                  ...spriteSheetSettings,
                  enabled: false,
                }}
              />
            </>
          }
          right={
            <>
              <ControlsPanel
                settings={settings}
                onChange={setSettings}
                eyedropperActive={eyedropperActive}
                onToggleEyedropper={toggleEyedropper}
              />
              <div style={styles.section}>
                <span style={styles.sectionTitle}>Mask actions</span>
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={autoTune}
                  >
                    Auto-tune
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={resetMask}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </>
          }
        />
      )}

      {activeStep === 'build' && (
        <Workspace
          left={
            <>
              <InfoPanel
                image={image}
                settings={settings}
                outputWidth={outputWidth}
                outputHeight={outputHeight}
                outputFrames={outputFrames}
                diagnostics={diagnostics}
                mode="build"
              />
              <AnimationPreviewPanel
                image={image}
                settings={settings}
                spriteSheetSettings={spriteSheetSettings}
              />
            </>
          }
          center={
            <>
              <Toolbar>
                <span style={styles.toolbarLabel}>Preview</span>
                {SHEET_VIEW_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    style={pillStyle(sheetViewMode === mode.value)}
                    onClick={() => setSheetViewMode(mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
                <ZoomControls
                  zoom={zoom}
                  zoomIn={zoomIn}
                  zoomOut={zoomOut}
                  zoomFit={zoomFit}
                  zoomReset={zoomReset}
                  fitActive={zoom === 'fit'}
                  pillStyle={pillStyle}
                />
              </Toolbar>
              <PreviewCanvas
                image={image}
                settings={settings}
                previewBackground="checker"
                viewMode={sheetViewMode}
                zoom={zoom}
                onZoomChange={setZoom}
                eyedropperActive={false}
                onPickColor={handlePickColor}
                spriteSheetSettings={spriteSheetSettings}
              />
            </>
          }
          right={
            <SpriteSheetPanel
              settings={spriteSheetSettings}
              onChange={setSpriteSheetSettings}
              image={image}
              chromaSettings={settings}
              diagnostics={diagnostics}
            />
          }
        />
      )}

      {activeStep === 'export' && (
        <Workspace
          left={
            <InfoPanel
              image={image}
              settings={settings}
              outputWidth={outputWidth}
              outputHeight={outputHeight}
              outputFrames={outputFrames}
              diagnostics={diagnostics}
              mode="export"
            />
          }
          center={
            <>
              <div style={styles.canvasIntro}>Final transparent PNG preview.</div>
              <PreviewCanvas
                image={image}
                settings={settings}
                previewBackground="checker"
                viewMode={spriteSheetSettings.enabled ? 'sheet-final' : 'processed'}
                zoom={zoom}
                onZoomChange={setZoom}
                eyedropperActive={false}
                onPickColor={handlePickColor}
                spriteSheetSettings={spriteSheetSettings}
              />
            </>
          }
          right={
            <>
              <InfoPanel
                image={image}
                settings={settings}
                outputWidth={outputWidth}
                outputHeight={outputHeight}
                outputFrames={outputFrames}
                diagnostics={diagnostics}
                mode="summary"
              />
              <ProjectPresetPanel
                chromaKey={settings}
                spriteSheet={spriteSheetSettings}
                onLoad={(preset) => {
                  setSettings(preset.chromaKey);
                  setSpriteSheetSettings(preset.spriteSheet);
                }}
              />
              <ExportPanel
                image={image}
                settings={settings}
                spriteSheetSettings={spriteSheetSettings}
              />
            </>
          }
        />
      )}

      <footer style={styles.footer}>
        <div style={styles.footerMeta}>
          <span style={styles.footerHint}>{footerHint(activeStep)}</span>
        </div>
        <div style={styles.footerButtons}>
          {activeStep !== 'import' && (
            <button type="button" style={styles.secondaryButton} onClick={goBack}>
              Back
            </button>
          )}
          {activeStep === 'clean' && (
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={skipBuild}
            >
              Skip sheet building
            </button>
          )}
          {activeStep !== 'export' && (
            <button
              type="button"
              style={{
                ...styles.primaryButton,
                ...(primaryDisabled ? styles.primaryDisabled : {}),
              }}
              disabled={primaryDisabled}
              onClick={continuePrimary}
            >
              {primaryLabel(activeStep)}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

interface WorkspaceProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

function Workspace({ left, center, right }: WorkspaceProps) {
  return (
    <div style={styles.workspace}>
      <aside style={styles.panel}>{left}</aside>
      <main style={styles.center}>{center}</main>
      <aside style={styles.rightPanel}>{right}</aside>
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div style={styles.toolbar}>{children}</div>;
}

interface ZoomControlsProps {
  zoom: Zoom;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  zoomReset: () => void;
  fitActive: boolean;
  pillStyle: (active: boolean) => CSSProperties;
}

function ZoomControls({
  zoom,
  zoomIn,
  zoomOut,
  zoomFit,
  zoomReset,
  fitActive,
  pillStyle,
}: ZoomControlsProps) {
  return (
    <div style={styles.zoomGroup}>
      <span style={styles.toolbarLabel}>Zoom</span>
      <button
        type="button"
        style={styles.zoomStep}
        onClick={zoomOut}
        aria-label="Zoom out"
      >
        -
      </button>
      <button
        type="button"
        style={styles.zoomValue}
        onClick={zoomReset}
        title="Reset to 100%"
      >
        {formatZoom(zoom)}
      </button>
      <button
        type="button"
        style={styles.zoomStep}
        onClick={zoomIn}
        aria-label="Zoom in"
      >
        +
      </button>
      <button type="button" style={pillStyle(fitActive)} onClick={zoomFit}>
        Fit
      </button>
    </div>
  );
}

interface InfoPanelProps {
  image: LoadedImage | null;
  settings: ChromaKeySettings;
  outputWidth: number;
  outputHeight: number;
  outputFrames: number;
  diagnostics?: SpriteSheetDiagnostic[];
  mode: 'import' | 'clean' | 'build' | 'export' | 'summary';
}

function InfoPanel({
  image,
  settings,
  outputWidth,
  outputHeight,
  outputFrames,
  diagnostics = [],
  mode,
}: InfoPanelProps) {
  const title =
    mode === 'summary'
      ? 'Output summary'
      : mode === 'build'
        ? 'Frame context'
        : mode === 'clean'
          ? 'Source context'
          : mode === 'export'
            ? 'Final output'
            : 'Import check';

  return (
    <div style={styles.section}>
      <span style={styles.sectionTitle}>{title}</span>
      <div style={styles.infoCard}>
        <InfoLine label="File" value={image?.name ?? 'No PNG loaded'} />
        <InfoLine
          label="Source"
          value={image ? `${image.width} x ${image.height} px` : '-'}
        />
        <InfoLine label="Size" value={image?.size ? formatBytes(image.size) : '-'} />
        <InfoLine label="Format" value={image?.type || 'image/png'} />
      </div>
      <div style={styles.infoCard}>
        <InfoLine
          label="Detected key"
          value={`rgb(${settings.keyColor.r}, ${settings.keyColor.g}, ${settings.keyColor.b})`}
        />
        <InfoLine label="Tolerance" value={String(settings.tolerance)} />
        <InfoLine label="Softness" value={String(settings.softness)} />
      </div>
      {(mode === 'build' || mode === 'export' || mode === 'summary') && (
        <div style={styles.infoCard}>
          <InfoLine label="Frames" value={String(outputFrames)} />
          <InfoLine
            label="Final size"
            value={outputWidth && outputHeight ? `${outputWidth} x ${outputHeight} px` : '-'}
          />
          <InfoLine label="Format" value="PNG transparent" />
        </div>
      )}
      {(mode === 'build' || mode === 'export' || mode === 'summary') && (
        <DiagnosticList diagnostics={diagnostics} />
      )}
    </div>
  );
}

function DiagnosticList({
  diagnostics,
}: {
  diagnostics: SpriteSheetDiagnostic[];
}) {
  return (
    <div style={styles.diagnosticList}>
      <span style={styles.sectionTitle}>Warnings</span>
      {diagnostics.length === 0 ? (
        <div style={styles.diagnostic}>No sheet warnings detected.</div>
      ) : (
        diagnostics.map((diagnostic) => (
          <div
            key={diagnostic.code}
            style={{
              ...styles.diagnostic,
              ...(diagnostic.severity === 'error'
                ? styles.diagnosticError
                : {}),
            }}
          >
            {diagnostic.message}
          </div>
        ))
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoLine}>
      <span>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function footerHint(step: WorkflowStep): string {
  if (step === 'import') return 'Start with a source PNG.';
  if (step === 'clean') return 'Tune the mask before thinking about frames.';
  if (step === 'build') return 'Build a regular game-ready grid.';
  return 'Check the final image and export the PNG.';
}

function primaryLabel(step: WorkflowStep): string {
  if (step === 'import') return 'Continue to Clean Background';
  if (step === 'clean') return 'Continue to Build Sprite Sheet';
  if (step === 'build') return 'Continue to Export';
  return 'Export PNG';
}
