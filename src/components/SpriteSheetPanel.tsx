import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChangeEvent,
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import {
  createAnimationClip,
  ensureAnimationSettings,
  getActiveAnimation,
  getAnimationClips,
  syncLegacyAnimationFields,
} from '../lib/animationClips';
import { applyChromaKey } from '../lib/chromaKey';
import {
  createManualFrame,
  duplicateManualFrame,
  getEffectiveManualFrames,
  initializeManualFrames,
  syncManualFramesWithSourceSelection,
} from '../lib/manualFrames';
import {
  autoCenterManualFrames,
  getSourceGridRects,
} from '../lib/spriteSheet';
import { SPRITESHEET_TEMPLATES } from '../lib/spriteSheetTemplates';
import type { ChromaKeySettings, LoadedImage } from '../types/image';
import type {
  Rect,
  SpriteSheetAnchor,
  SpriteSheetAnimationClip,
  SpriteSheetFitMode,
  SpriteSheetManualFrame,
  SpriteSheetSettings,
} from '../types/spriteSheet';
import { colors, fontSize, radii, spacing } from '../theme';

export interface SpriteSheetPanelProps {
  settings: SpriteSheetSettings;
  onChange: (settings: SpriteSheetSettings) => void;
  image?: LoadedImage | null;
  chromaSettings?: ChromaKeySettings;
}

const TILE_CANVAS_SIZE = 64;
const CHECKER_TILE = 8;

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
    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
    gap: spacing.sm,
  },
  frameTile: {
    position: 'relative',
    aspectRatio: '1 / 1',
    padding: 4,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.md,
    backgroundColor: colors.bgInput,
    color: colors.textFaint,
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border-color 120ms ease',
    display: 'grid',
    placeItems: 'center',
  },
  frameTileIncluded: {
    borderColor: colors.accentHi,
    boxShadow: `inset 0 0 0 1px ${colors.accent}`,
  },
  frameTileExcluded: {
    opacity: 0.45,
    filter: 'grayscale(0.35)',
  },
  frameTileCanvas: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    borderRadius: radii.sm,
  },
  frameTileBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 16,
    padding: '0 4px',
    height: 16,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    borderRadius: radii.sm,
    pointerEvents: 'none',
  },
  frameTileBadgeIncluded: {
    backgroundColor: colors.accent,
  },
  frameTileEmptyState: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    padding: spacing.md,
    border: `1px dashed ${colors.borderInput}`,
    borderRadius: radii.md,
    textAlign: 'center',
  },
  manualList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    maxHeight: 180,
    overflowY: 'auto',
    paddingRight: 2,
  },
  manualItem: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: '7px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: fontSize.xs,
  },
  manualItemActive: {
    borderColor: colors.accentHi,
    boxShadow: `inset 0 0 0 1px ${colors.accent}`,
  },
  manualIndex: {
    color: colors.textFaint,
    fontVariantNumeric: 'tabular-nums',
  },
  manualName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  manualMeta: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
  },
  clipList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  clipItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: '7px 8px',
    border: `1px solid ${colors.borderInput}`,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInput,
    color: colors.textSecondary,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: fontSize.xs,
  },
  clipItemMeta: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    fontVariantNumeric: 'tabular-nums',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.sm,
  },
  actionGridWide: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.sm,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
};

export function SpriteSheetPanel({
  settings,
  onChange,
  image = null,
  chromaSettings,
}: SpriteSheetPanelProps) {
  const [selectedManualFrameId, setSelectedManualFrameId] = useState<string | null>(
    null,
  );
  const [selectedManualFrameIds, setSelectedManualFrameIds] = useState<string[]>(
    [],
  );
  const undoStack = useRef<SpriteSheetSettings[]>([]);
  const redoStack = useRef<SpriteSheetSettings[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

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
  const manualFrames = getEffectiveManualFrames(settings);
  const animationClips = getAnimationClips(settings);
  const activeAnimation = getActiveAnimation(settings);
  const selectedManualIndex = manualFrames.findIndex(
    (frame) => frame.id === selectedManualFrameId,
  );
  const selectedManualFrame =
    selectedManualIndex >= 0 ? manualFrames[selectedManualIndex] : null;
  const selectedManualFrameSet = new Set(selectedManualFrameIds);
  const selectedManualFrames = manualFrames.filter((frame) =>
    selectedManualFrameSet.has(frame.id),
  );
  const selectedManualCount = selectedManualFrames.length;

  useEffect(() => {
    if (manualFrames.length === 0) {
      setSelectedManualFrameId(null);
      setSelectedManualFrameIds([]);
      return;
    }
    if (!selectedManualFrameId || selectedManualIndex === -1) {
      setSelectedManualFrameId(manualFrames[0].id);
      setSelectedManualFrameIds([manualFrames[0].id]);
    }
  }, [manualFrames, selectedManualFrameId, selectedManualIndex]);

  const setExcludedFrames = (excludedSourceFrameIndices: number[]) => {
    onChange({
      ...settings,
      excludedSourceFrameIndices,
      manualFrames:
        settings.manualFrames.length > 0
          ? syncManualFramesWithSourceSelection(
              settings,
              excludedSourceFrameIndices,
            )
          : settings.manualFrames,
    });
  };

  const toggleSourceFrame = (sourceIndex: number) => {
    const next = new Set(settings.excludedSourceFrameIndices);
    if (next.has(sourceIndex)) next.delete(sourceIndex);
    else next.add(sourceIndex);
    setExcludedFrames([...next].sort((a, b) => a - b));
  };

  const commitManualSettings = (next: SpriteSheetSettings) => {
    undoStack.current.push(settings);
    redoStack.current = [];
    setHistoryVersion((value) => value + 1);
    onChange(next);
  };

  const commitAnimationSettings = (next: SpriteSheetSettings) => {
    commitManualSettings(syncLegacyAnimationFields(ensureAnimationSettings(next)));
  };

  const commitManualFrames = (frames: SpriteSheetManualFrame[]) => {
    commitManualSettings({
      ...initializeManualFrames(settings),
      manualFrames: frames,
    });
  };

  const applyPatchToSelection = (patch: Partial<SpriteSheetManualFrame>) => {
    const targetIds =
      selectedManualFrameIds.length > 0
        ? new Set(selectedManualFrameIds)
        : selectedManualFrameId
          ? new Set([selectedManualFrameId])
          : new Set<string>();
    const frames = getEffectiveManualFrames(settings).map((frame) =>
      targetIds.has(frame.id) && !frame.locked ? { ...frame, ...patch } : frame,
    );
    commitManualFrames(frames);
  };

  const moveManualFrame = (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= manualFrames.length) return;
    const current = manualFrames[fromIndex];
    const target = manualFrames[toIndex];
    if (current.locked || target.locked) return;
    const frames = [...manualFrames];
    frames[fromIndex] = target;
    frames[toIndex] = current;
    commitManualFrames(frames);
    setSelectedManualFrameId(current.id);
  };

  const duplicateSelectedFrame = () => {
    if (selectedManualFrames.length === 0) return;
    const frames = [...manualFrames];
    const selectedIds = new Set(selectedManualFrameIds);
    let insertOffset = 0;
    let lastDuplicateId: string | null = null;
    manualFrames.forEach((frame, index) => {
      if (!selectedIds.has(frame.id) || frame.locked) return;
      const duplicate = duplicateManualFrame(frame);
      frames.splice(index + 1 + insertOffset, 0, duplicate);
      insertOffset += 1;
      lastDuplicateId = duplicate.id;
    });
    commitManualFrames(frames);
    if (lastDuplicateId) {
      setSelectedManualFrameId(lastDuplicateId);
      setSelectedManualFrameIds([lastDuplicateId]);
    }
  };

  const deleteSelectedFrame = () => {
    if (selectedManualFrames.length === 0) return;
    const selectedIds = new Set(
      selectedManualFrames.filter((frame) => !frame.locked).map((frame) => frame.id),
    );
    const frames = manualFrames.filter(
      (frame) => !selectedIds.has(frame.id),
    );
    const nextFrames = frames.length > 0 ? frames : [createManualFrame(null, 0)];
    commitManualFrames(nextFrames);
    const nextId =
      nextFrames[Math.min(selectedManualIndex, nextFrames.length - 1)]?.id ?? null;
    setSelectedManualFrameId(nextId);
    setSelectedManualFrameIds(nextId ? [nextId] : []);
  };

  const toggleSelectedLock = () => {
    if (selectedManualFrames.length === 0) return;
    const shouldLock = selectedManualFrames.some((frame) => !frame.locked);
    const targetIds = new Set(selectedManualFrameIds);
    const frames = manualFrames.map((frame) =>
      targetIds.has(frame.id)
        ? { ...frame, locked: shouldLock }
        : frame,
    );
    commitManualFrames(frames);
  };

  const autoCenterFrames = (
    processedImageData: ImageData | null,
    axis: 'x' | 'y' | 'xy',
  ) => {
    if (!processedImageData) return;
    const targetIds =
      selectedManualFrameIds.length > 0
        ? new Set(selectedManualFrameIds)
        : undefined;
    commitManualFrames(
      autoCenterManualFrames(
        processedImageData,
        initializeManualFrames(settings),
        axis,
        targetIds,
      ),
    );
  };

  const updateActiveAnimation = (
    patch: Partial<SpriteSheetAnimationClip>,
  ) => {
    const next = ensureAnimationSettings(settings);
    const clips = getAnimationClips(next).map((clip) =>
      clip.id === next.activeAnimationId ? { ...clip, ...patch } : clip,
    );
    commitAnimationSettings({
      ...next,
      animations: clips,
    });
  };

  const selectAnimationClip = (clipId: string) => {
    commitAnimationSettings({
      ...ensureAnimationSettings(settings),
      activeAnimationId: clipId,
    });
  };

  const addAnimationClip = () => {
    const next = ensureAnimationSettings(settings);
    const clip = createAnimationClip({
      name: `clip_${animationClips.length + 1}`,
      startFrame: 1,
      endFrame: Math.max(1, manualFrames.length),
      fps: activeAnimation.fps,
      loop: activeAnimation.loop,
      pingPong: activeAnimation.pingPong,
    });
    commitAnimationSettings({
      ...next,
      animations: [...animationClips, clip],
      activeAnimationId: clip.id,
    });
  };

  const deleteActiveAnimation = () => {
    if (animationClips.length <= 1) return;
    const nextClips = animationClips.filter(
      (clip) => clip.id !== activeAnimation.id,
    );
    commitAnimationSettings({
      ...ensureAnimationSettings(settings),
      animations: nextClips,
      activeAnimationId: nextClips[0]?.id ?? null,
    });
  };

  const undoManualAction = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(settings);
    setHistoryVersion((value) => value + 1);
    onChange(previous);
  };

  const redoManualAction = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(settings);
    setHistoryVersion((value) => value + 1);
    onChange(next);
  };

  const handleManualFrameClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    frameId: string,
    frameIndex: number,
  ) => {
    if (event.shiftKey && selectedManualFrameId) {
      const anchorIndex = manualFrames.findIndex(
        (frame) => frame.id === selectedManualFrameId,
      );
      if (anchorIndex !== -1) {
        const [start, end] =
          anchorIndex < frameIndex
            ? [anchorIndex, frameIndex]
            : [frameIndex, anchorIndex];
        const ids = manualFrames.slice(start, end + 1).map((frame) => frame.id);
        setSelectedManualFrameIds(ids);
        setSelectedManualFrameId(frameId);
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      const next = new Set(selectedManualFrameIds);
      if (next.has(frameId)) next.delete(frameId);
      else next.add(frameId);
      const ids = [...next];
      setSelectedManualFrameIds(ids);
      setSelectedManualFrameId(frameId);
      return;
    }
    setSelectedManualFrameId(frameId);
    setSelectedManualFrameIds([frameId]);
  };

  const sharedOffsetX = getSharedManualValue(selectedManualFrames, 'offsetX');
  const sharedOffsetY = getSharedManualValue(selectedManualFrames, 'offsetY');

  void historyVersion;

  const processedCanvas = useMemo(() => {
    if (!image || !chromaSettings) return null;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image.element, 0, 0);
    const source = ctx.getImageData(0, 0, image.width, image.height);
    const processed = applyChromaKey(source, chromaSettings);
    ctx.clearRect(0, 0, image.width, image.height);
    ctx.putImageData(processed, 0, 0);
    return canvas;
  }, [image, chromaSettings]);

  const processedImageData = useMemo(() => {
    if (!processedCanvas) return null;
    const ctx = processedCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    return ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
  }, [processedCanvas]);

  const sourceRects = useMemo<Rect[]>(() => {
    if (!image) return [];
    return getSourceGridRects(image.width, image.height, settings);
  }, [
    image,
    settings.sourceColumns,
    settings.sourceRows,
    settings.sourceMarginX,
    settings.sourceMarginY,
    settings.sourceGapX,
    settings.sourceGapY,
  ]);

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
                  animations: [
                    createAnimationClip({
                      id: 'default-animation',
                      name: 'default',
                      startFrame: 1,
                      endFrame:
                        template.settings.outputColumns * template.settings.outputRows,
                      fps: 8,
                      loop: true,
                      pingPong: false,
                    }),
                  ],
                  activeAnimationId: 'default-animation',
                  manualFrames: [],
                  animationStartFrame: 1,
                  animationEndFrame:
                    template.settings.outputColumns * template.settings.outputRows,
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
        {image ? (
          <div style={styles.frameGrid}>
            {Array.from({ length: sourceFrameCount }, (_, sourceIndex) => {
              const included = !excluded.has(sourceIndex);
              const rect = sourceRects[sourceIndex];
              return (
                <FramePreviewTile
                  key={sourceIndex}
                  index={sourceIndex}
                  rect={rect}
                  sourceCanvas={processedCanvas}
                  included={included}
                  disabled={!settings.enabled}
                  onClick={() => toggleSourceFrame(sourceIndex)}
                />
              );
            })}
          </div>
        ) : (
          <div style={styles.frameTileEmptyState}>
            Load a PNG to preview frames.
          </div>
        )}
      </div>

      <div style={contentStyle}>
        <span style={styles.section}>Manual corrections</span>
        <div style={styles.frameToolbar}>
          <span style={styles.frameCount}>
            {manualFrames.length} ordered frame{manualFrames.length === 1 ? '' : 's'}
            {selectedManualCount > 0 ? ` - ${selectedManualCount} selected` : ''}
          </span>
          <button
            type="button"
            disabled={!settings.enabled || manualFrames.length === 0}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled || manualFrames.length === 0
                ? styles.modeButtonDisabled
                : {}),
            }}
            onClick={() => {
              setSelectedManualFrameIds(manualFrames.map((frame) => frame.id));
              setSelectedManualFrameId(manualFrames[0]?.id ?? null);
            }}
          >
            Select all
          </button>
          <button
            type="button"
            disabled={!settings.enabled || selectedManualCount === 0}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled || selectedManualCount === 0
                ? styles.modeButtonDisabled
                : {}),
            }}
            onClick={() => {
              setSelectedManualFrameIds([]);
              setSelectedManualFrameId(null);
            }}
          >
            Clear selection
          </button>
          <button
            type="button"
            disabled={!settings.enabled || undoStack.current.length === 0}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled || undoStack.current.length === 0
                ? styles.modeButtonDisabled
                : {}),
            }}
            onClick={undoManualAction}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!settings.enabled || redoStack.current.length === 0}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled || redoStack.current.length === 0
                ? styles.modeButtonDisabled
                : {}),
            }}
            onClick={redoManualAction}
          >
            Redo
          </button>
        </div>
        <div style={styles.manualList}>
          {manualFrames.map((frame, index) => (
            <button
              key={frame.id}
              type="button"
              disabled={!settings.enabled}
              style={{
                ...styles.manualItem,
                ...(selectedManualFrameSet.has(frame.id)
                  ? styles.manualItemActive
                  : {}),
                ...(!settings.enabled ? styles.modeButtonDisabled : {}),
              }}
              onClick={(event) => handleManualFrameClick(event, frame.id, index)}
            >
              <span style={styles.manualIndex}>{index + 1}</span>
              <span style={styles.manualName}>{frame.name}</span>
              <span style={styles.manualMeta}>
                {frame.locked ? 'Locked' : `Src ${frame.sourceIndex === null ? '-' : frame.sourceIndex + 1}`}
              </span>
            </button>
          ))}
        </div>
        {selectedManualCount > 0 ? (
          <>
            <label style={styles.field}>
              <span style={styles.label}>Frame name</span>
              <input
                type="text"
                value={selectedManualCount === 1 ? selectedManualFrame?.name ?? '' : ''}
                disabled={
                  !settings.enabled ||
                  selectedManualCount !== 1 ||
                  selectedManualFrame?.locked
                }
                onChange={(event) =>
                  applyPatchToSelection({
                    name: event.target.value || selectedManualFrame?.name || 'frame',
                  })
                }
                style={styles.input}
                placeholder={
                  selectedManualCount === 1
                    ? ''
                    : 'Rename is only available for a single selected frame'
                }
              />
            </label>
            <div style={styles.grid}>
              <NumberField
                label="Offset X"
                min={-4096}
                max={4096}
                value={sharedOffsetX}
                disabled={!settings.enabled}
                onChange={(event) =>
                  applyPatchToSelection({
                    offsetX: clampNumberInput(event.target.value, -4096, 4096),
                  })
                }
              />
              <NumberField
                label="Offset Y"
                min={-4096}
                max={4096}
                value={sharedOffsetY}
                disabled={!settings.enabled}
                onChange={(event) =>
                  applyPatchToSelection({
                    offsetY: clampNumberInput(event.target.value, -4096, 4096),
                  })
                }
              />
            </div>
            <div style={styles.actionGridWide}>
              <button
                type="button"
                disabled={!settings.enabled || !processedImageData}
                style={styles.compactButton}
                title="Auto-center all unlocked frames horizontally"
                onClick={() => autoCenterFrames(processedImageData, 'x')}
              >
                Auto-center X
              </button>
              <button
                type="button"
                disabled={!settings.enabled || !processedImageData}
                style={styles.compactButton}
                title="Auto-center all unlocked frames vertically"
                onClick={() => autoCenterFrames(processedImageData, 'y')}
              >
                Auto-center Y
              </button>
              <button
                type="button"
                disabled={!settings.enabled || !processedImageData}
                style={styles.compactButton}
                title="Auto-center all unlocked frames on both axes"
                onClick={() => autoCenterFrames(processedImageData, 'xy')}
              >
                Auto-center XY
              </button>
            </div>
            <div style={styles.actionGrid}>
              <button
                type="button"
                disabled={
                  !settings.enabled ||
                  selectedManualCount !== 1 ||
                  selectedManualFrame?.locked ||
                  selectedManualIndex <= 0
                }
                style={styles.compactButton}
                onClick={() => moveManualFrame(selectedManualIndex, -1)}
              >
                Up
              </button>
              <button
                type="button"
                disabled={
                  !settings.enabled ||
                  selectedManualCount !== 1 ||
                  selectedManualFrame?.locked ||
                  selectedManualIndex >= manualFrames.length - 1
                }
                style={styles.compactButton}
                onClick={() => moveManualFrame(selectedManualIndex, 1)}
              >
                Down
              </button>
              <button
                type="button"
                disabled={
                  !settings.enabled ||
                  selectedManualFrames.every((frame) => frame.locked)
                }
                style={styles.compactButton}
                onClick={duplicateSelectedFrame}
              >
                Duplicate
              </button>
              <button
                type="button"
                disabled={
                  !settings.enabled ||
                  selectedManualFrames.every((frame) => frame.locked)
                }
                style={styles.compactButton}
                onClick={deleteSelectedFrame}
              >
                Delete
              </button>
              <button
                type="button"
                disabled={!settings.enabled || selectedManualCount === 0}
                style={styles.compactButton}
                onClick={toggleSelectedLock}
              >
                {selectedManualFrames.some((frame) => !frame.locked)
                  ? 'Lock'
                  : 'Unlock'}
              </button>
            </div>
          </>
        ) : (
          <div style={styles.frameTileEmptyState}>
            Include at least one frame to edit the output order.
          </div>
        )}
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

      <div style={contentStyle}>
        <span style={styles.section}>Animation</span>
        <div style={styles.frameToolbar}>
          <span style={styles.frameCount}>
            {animationClips.length} clip{animationClips.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            disabled={!settings.enabled}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled ? styles.modeButtonDisabled : {}),
            }}
            onClick={addAnimationClip}
          >
            Add clip
          </button>
          <button
            type="button"
            disabled={!settings.enabled || animationClips.length <= 1}
            style={{
              ...styles.compactButton,
              ...(!settings.enabled || animationClips.length <= 1
                ? styles.modeButtonDisabled
                : {}),
            }}
            onClick={deleteActiveAnimation}
          >
            Delete clip
          </button>
        </div>
        <div style={styles.clipList}>
          {animationClips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              disabled={!settings.enabled}
              style={{
                ...styles.clipItem,
                ...(clip.id === activeAnimation.id ? styles.manualItemActive : {}),
                ...(!settings.enabled ? styles.modeButtonDisabled : {}),
              }}
              onClick={() => selectAnimationClip(clip.id)}
            >
              <span style={styles.manualName}>{clip.name}</span>
              <span style={styles.clipItemMeta}>
                {clip.startFrame}-{clip.endFrame} @ {clip.fps} fps
              </span>
            </button>
          ))}
        </div>
        <div style={styles.grid}>
          <label style={{ ...styles.field, ...styles.fullWidth }}>
            <span style={styles.label}>Name</span>
            <input
              type="text"
              value={activeAnimation.name}
              disabled={!settings.enabled}
              onChange={(event) =>
                updateActiveAnimation({ name: event.target.value || 'clip' })
              }
              style={styles.input}
            />
          </label>
          <NumberField
            label="Start"
            min={1}
            max={Math.max(1, manualFrames.length)}
            value={activeAnimation.startFrame}
            disabled={!settings.enabled}
            onChange={(event) =>
              updateActiveAnimation({
                startFrame: clampNumberInput(
                  event.target.value,
                  1,
                  Math.max(1, manualFrames.length),
                ),
              })
            }
          />
          <NumberField
            label="End"
            min={1}
            max={Math.max(1, manualFrames.length)}
            value={activeAnimation.endFrame}
            disabled={!settings.enabled}
            onChange={(event) =>
              updateActiveAnimation({
                endFrame: clampNumberInput(
                  event.target.value,
                  1,
                  Math.max(1, manualFrames.length),
                ),
              })
            }
          />
          <NumberField
            label="FPS"
            min={1}
            max={60}
            value={activeAnimation.fps}
            disabled={!settings.enabled}
            onChange={(event) =>
              updateActiveAnimation({
                fps: clampNumberInput(event.target.value, 1, 60),
              })
            }
          />
          <label style={styles.toggleRow}>
            <span>Loop</span>
            <input
              type="checkbox"
              checked={activeAnimation.loop}
              disabled={!settings.enabled}
              onChange={(event) =>
                updateActiveAnimation({ loop: event.target.checked })
              }
              style={styles.checkbox}
            />
          </label>
          <label style={styles.toggleRow}>
            <span>Ping-pong</span>
            <input
              type="checkbox"
              checked={activeAnimation.pingPong}
              disabled={!settings.enabled}
              onChange={(event) =>
                updateActiveAnimation({ pingPong: event.target.checked })
              }
              style={styles.checkbox}
            />
          </label>
        </div>
      </div>

      <span style={styles.help}>
        Processed preview and export use the rebuilt sheet while this mode is
        enabled.
      </span>
    </div>
  );
}

interface FramePreviewTileProps {
  index: number;
  rect: Rect | undefined;
  sourceCanvas: HTMLCanvasElement | null;
  included: boolean;
  disabled: boolean;
  onClick: () => void;
}

function FramePreviewTile({
  index,
  rect,
  sourceCanvas,
  included,
  disabled,
  onClick,
}: FramePreviewTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;

    ctx.clearRect(0, 0, size, size);
    drawCheckerBackground(ctx, size);

    if (sourceCanvas && rect && rect.width > 0 && rect.height > 0) {
      const scale = Math.min(size / rect.width, size / rect.height);
      const drawWidth = rect.width * scale;
      const drawHeight = rect.height * scale;
      const drawX = (size - drawWidth) / 2;
      const drawY = (size - drawHeight) / 2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        sourceCanvas,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
    }
  }, [sourceCanvas, rect]);

  const buttonStyle: CSSProperties = {
    ...styles.frameTile,
    ...(included ? styles.frameTileIncluded : styles.frameTileExcluded),
    ...(disabled ? styles.modeButtonDisabled : {}),
  };

  const badgeStyle: CSSProperties = {
    ...styles.frameTileBadge,
    ...(included ? styles.frameTileBadgeIncluded : {}),
  };

  return (
    <button
      type="button"
      disabled={disabled}
      style={buttonStyle}
      aria-pressed={included}
      title={
        included
          ? `Frame ${index + 1} included - click to exclude`
          : `Frame ${index + 1} excluded - click to include`
      }
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={TILE_CANVAS_SIZE}
        height={TILE_CANVAS_SIZE}
        style={styles.frameTileCanvas}
      />
      <span style={badgeStyle}>{index + 1}</span>
    </button>
  );
}

function drawCheckerBackground(
  ctx: CanvasRenderingContext2D,
  size: number,
): void {
  const tile = document.createElement('canvas');
  tile.width = CHECKER_TILE;
  tile.height = CHECKER_TILE;
  const tctx = tile.getContext('2d');
  if (!tctx) {
    ctx.fillStyle = colors.checkerLight;
    ctx.fillRect(0, 0, size, size);
    return;
  }
  const half = CHECKER_TILE / 2;
  tctx.fillStyle = colors.checkerLight;
  tctx.fillRect(0, 0, CHECKER_TILE, CHECKER_TILE);
  tctx.fillStyle = colors.checkerDark;
  tctx.fillRect(0, 0, half, half);
  tctx.fillRect(half, half, half, half);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) {
    ctx.fillStyle = colors.checkerLight;
    ctx.fillRect(0, 0, size, size);
    return;
  }
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, size, size);
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
  value: number | '';
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

function clampNumberInput(value: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function getSharedManualValue(
  frames: SpriteSheetManualFrame[],
  key: 'offsetX' | 'offsetY',
): number | '' {
  if (frames.length === 0) return '';
  const first = frames[0][key];
  return frames.every((frame) => frame[key] === first) ? first : '';
}
