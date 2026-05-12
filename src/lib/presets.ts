import type { ChromaKeySettings, RGB } from '../types/image';
import type { SpriteSheetSettings } from '../types/spriteSheet';

const PRESET_VERSION = 1;
const PROJECT_PRESET_VERSION = 2;

export interface PresetFile {
  version: number;
  settings: ChromaKeySettings;
  createdAt?: string;
}

export interface ProjectPreset {
  version: number;
  chromaKey: ChromaKeySettings;
  spriteSheet: SpriteSheetSettings;
  createdAt?: string;
}

export function serializePreset(settings: ChromaKeySettings): string {
  const preset: PresetFile = {
    version: PRESET_VERSION,
    settings,
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(preset, null, 2);
}

export function parsePreset(text: string): ChromaKeySettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }
  if (!isPresetShape(parsed)) {
    throw new Error('Not a valid preset file');
  }
  return parsed.settings;
}

export function serializeProjectPreset(
  chromaKey: ChromaKeySettings,
  spriteSheet: SpriteSheetSettings,
): string {
  const preset: ProjectPreset = {
    version: PROJECT_PRESET_VERSION,
    chromaKey,
    spriteSheet,
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(preset, null, 2);
}

export function parseProjectPreset(text: string): ProjectPreset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }
  if (isProjectPresetShape(parsed)) {
    return {
      ...parsed,
      spriteSheet: normalizeSpriteSheetSettings(parsed.spriteSheet),
    };
  }
  if (isPresetShape(parsed)) {
    throw new Error('This is a mask-only preset. Load it from Clean Background.');
  }
  throw new Error('Not a valid project preset file');
}

function isPresetShape(value: unknown): value is PresetFile {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === 'number' && isChromaKeySettings(obj.settings)
  );
}

function isProjectPresetShape(value: unknown): value is ProjectPreset {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === 'number' &&
    isChromaKeySettings(obj.chromaKey) &&
    isSpriteSheetSettings(obj.spriteSheet)
  );
}

function isChromaKeySettings(value: unknown): value is ChromaKeySettings {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    isRGB(obj.keyColor) &&
    isFiniteNumber(obj.tolerance) &&
    isFiniteNumber(obj.softness) &&
    isFiniteNumber(obj.spillSuppression) &&
    isFiniteNumber(obj.edgeCleanup) &&
    isFiniteNumber(obj.preserveDetails)
  );
}

function isRGB(value: unknown): value is RGB {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    isFiniteNumber(obj.r) &&
    isFiniteNumber(obj.g) &&
    isFiniteNumber(obj.b)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSpriteSheetSettings(value: unknown): value is SpriteSheetSettings {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.enabled === 'boolean' &&
    obj.extractionMode === 'source-grid' &&
    isFiniteNumber(obj.sourceColumns) &&
    isFiniteNumber(obj.sourceRows) &&
    isFiniteNumber(obj.sourceMarginX) &&
    isFiniteNumber(obj.sourceMarginY) &&
    isFiniteNumber(obj.sourceGapX) &&
    isFiniteNumber(obj.sourceGapY) &&
    isFiniteNumber(obj.outputColumns) &&
    isFiniteNumber(obj.outputRows) &&
    isFiniteNumber(obj.frameWidth) &&
    isFiniteNumber(obj.frameHeight) &&
    (obj.fitMode === 'contain' ||
      obj.fitMode === 'cover' ||
      obj.fitMode === 'original') &&
    (obj.anchor === 'center' ||
      obj.anchor === 'bottom-center' ||
      obj.anchor === 'top-center') &&
    isFiniteNumber(obj.padding) &&
    isFiniteNumber(obj.alphaThreshold) &&
    (obj.excludedSourceFrameIndices === undefined ||
      isNumberArray(obj.excludedSourceFrameIndices)) &&
    (obj.manualFrames === undefined || isManualFrameArray(obj.manualFrames)) &&
    (obj.animationName === undefined || typeof obj.animationName === 'string') &&
    (obj.animationStartFrame === undefined ||
      isFiniteNumber(obj.animationStartFrame)) &&
    (obj.animationEndFrame === undefined ||
      isFiniteNumber(obj.animationEndFrame)) &&
    (obj.animationFps === undefined || isFiniteNumber(obj.animationFps)) &&
    (obj.animationLoop === undefined ||
      typeof obj.animationLoop === 'boolean') &&
    (obj.animationPingPong === undefined ||
      typeof obj.animationPingPong === 'boolean')
  );
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function isManualFrameArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj.id === 'string' &&
        (typeof obj.sourceIndex === 'number' || obj.sourceIndex === null) &&
        typeof obj.name === 'string' &&
        isFiniteNumber(obj.offsetX) &&
        isFiniteNumber(obj.offsetY) &&
        typeof obj.locked === 'boolean'
      );
    })
  );
}

function normalizeSpriteSheetSettings(
  settings: SpriteSheetSettings,
): SpriteSheetSettings {
  return {
    ...settings,
    excludedSourceFrameIndices: settings.excludedSourceFrameIndices ?? [],
    animationName: settings.animationName ?? 'default',
    animationStartFrame: settings.animationStartFrame ?? 1,
    animationEndFrame:
      settings.animationEndFrame ??
      settings.outputColumns * settings.outputRows,
    animationFps: settings.animationFps ?? 8,
    animationLoop: settings.animationLoop ?? true,
    animationPingPong: settings.animationPingPong ?? false,
    manualFrames: settings.manualFrames ?? [],
  };
}

export function downloadPreset(
  settings: ChromaKeySettings,
  baseName = 'mask-preset',
): void {
  const blob = new Blob([serializePreset(settings)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readPresetFile(file: File): Promise<ChromaKeySettings> {
  const text = await file.text();
  return parsePreset(text);
}

export function downloadProjectPreset(
  chromaKey: ChromaKeySettings,
  spriteSheet: SpriteSheetSettings,
  baseName = 'chroma-sprite-project',
): void {
  const blob = new Blob([serializeProjectPreset(chromaKey, spriteSheet)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProjectPresetFile(file: File): Promise<ProjectPreset> {
  const text = await file.text();
  return parseProjectPreset(text);
}
