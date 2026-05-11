import type { ChromaKeySettings, RGB } from '../types/image';

const PRESET_VERSION = 1;

export interface PresetFile {
  version: number;
  settings: ChromaKeySettings;
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

function isPresetShape(value: unknown): value is PresetFile {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === 'number' && isChromaKeySettings(obj.settings)
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
