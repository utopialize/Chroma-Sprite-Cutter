import type {
  SpriteSheetManualFrame,
  SpriteSheetSettings,
} from '../types/spriteSheet';

export function getDefaultManualFrames(
  settings: SpriteSheetSettings,
): SpriteSheetManualFrame[] {
  const sourceCount = settings.sourceColumns * settings.sourceRows;
  const excluded = new Set(settings.excludedSourceFrameIndices);
  const frames: SpriteSheetManualFrame[] = [];

  for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
    if (excluded.has(sourceIndex)) continue;
    frames.push(createManualFrame(sourceIndex, frames.length, `source-${sourceIndex}`));
  }

  return frames;
}

export function getEffectiveManualFrames(
  settings: SpriteSheetSettings,
): SpriteSheetManualFrame[] {
  return settings.manualFrames.length > 0
    ? settings.manualFrames
    : getDefaultManualFrames(settings);
}

export function initializeManualFrames(
  settings: SpriteSheetSettings,
): SpriteSheetSettings {
  return settings.manualFrames.length > 0
    ? settings
    : { ...settings, manualFrames: getDefaultManualFrames(settings) };
}

export function syncManualFramesWithSourceSelection(
  settings: SpriteSheetSettings,
  excludedSourceFrameIndices: number[],
): SpriteSheetManualFrame[] {
  const sourceCount = settings.sourceColumns * settings.sourceRows;
  const excluded = new Set(excludedSourceFrameIndices);
  const current =
    settings.manualFrames.length > 0
      ? settings.manualFrames
      : getDefaultManualFrames(settings);
  const next = current.filter(
    (frame) =>
      frame.sourceIndex === null ||
      (frame.sourceIndex >= 0 &&
        frame.sourceIndex < sourceCount &&
        !excluded.has(frame.sourceIndex)),
  );
  const presentSources = new Set(
    next
      .map((frame) => frame.sourceIndex)
      .filter((sourceIndex): sourceIndex is number => sourceIndex !== null),
  );

  for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
    if (excluded.has(sourceIndex) || presentSources.has(sourceIndex)) continue;
    next.push(createManualFrame(sourceIndex, next.length));
  }

  return resequenceDefaultNames(next);
}

export function createManualFrame(
  sourceIndex: number | null,
  orderIndex: number,
  id = `${sourceIndex ?? 'empty'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): SpriteSheetManualFrame {
  return {
    id,
    sourceIndex,
    name: getDefaultFrameName(orderIndex),
    offsetX: 0,
    offsetY: 0,
    locked: false,
  };
}

export function duplicateManualFrame(
  frame: SpriteSheetManualFrame,
): SpriteSheetManualFrame {
  return {
    ...frame,
    id: `${frame.sourceIndex ?? 'empty'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${frame.name}_copy`,
    locked: false,
    offsetX: frame.offsetX,
    offsetY: frame.offsetY,
  };
}

function resequenceDefaultNames(
  frames: SpriteSheetManualFrame[],
): SpriteSheetManualFrame[] {
  return frames.map((frame, index) =>
    /^frame_\d{3}$/.test(frame.name)
      ? { ...frame, name: getDefaultFrameName(index) }
      : frame,
  );
}

function getDefaultFrameName(index: number): string {
  return `frame_${String(index + 1).padStart(3, '0')}`;
}
