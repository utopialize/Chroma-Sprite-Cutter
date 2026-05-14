import { describe, expect, it } from 'vitest';
import {
  parsePreset,
  parseProjectPreset,
  serializePreset,
  serializeProjectPreset,
} from './presets';
import { DEFAULT_SPRITESHEET_SETTINGS } from './spriteSheet';
import type { ChromaKeySettings } from '../types/image';

const SETTINGS: ChromaKeySettings = {
  keyColor: { r: 12, g: 200, b: 34 },
  tolerance: 40,
  softness: 25,
  spillSuppression: 60,
  edgeCleanup: 10,
  preserveDetails: 70,
};

describe('serializePreset / parsePreset', () => {
  it('round-trips settings unchanged', () => {
    const json = serializePreset(SETTINGS);
    const parsed = parsePreset(json);
    expect(parsed).toEqual(SETTINGS);
  });

  it('produces JSON with a version field', () => {
    const json = serializePreset(SETTINGS);
    const obj = JSON.parse(json);
    expect(obj.version).toBe(1);
    expect(obj.settings).toEqual(SETTINGS);
  });

  it('rejects invalid JSON', () => {
    expect(() => parsePreset('not json')).toThrow(/Invalid JSON/);
  });

  it('rejects JSON with the wrong shape', () => {
    expect(() => parsePreset('{}')).toThrow(/valid preset/);
    expect(() =>
      parsePreset(JSON.stringify({ version: 1, settings: {} })),
    ).toThrow(/valid preset/);
  });

  it('rejects JSON missing the keyColor field', () => {
    const broken = {
      version: 1,
      settings: {
        tolerance: 30,
        softness: 25,
        spillSuppression: 50,
        edgeCleanup: 0,
        preserveDetails: 50,
      },
    };
    expect(() => parsePreset(JSON.stringify(broken))).toThrow();
  });

  it('rejects JSON with non-numeric channels', () => {
    const broken = {
      version: 1,
      settings: {
        ...SETTINGS,
        keyColor: { r: '12', g: 200, b: 34 },
      },
    };
    expect(() => parsePreset(JSON.stringify(broken))).toThrow();
  });
});

describe('serializeProjectPreset / parseProjectPreset', () => {
  it('round-trips chroma and sprite sheet settings', () => {
    const json = serializeProjectPreset(SETTINGS, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      enabled: true,
      outputColumns: 8,
    });
    const parsed = parseProjectPreset(json);
    expect(parsed.version).toBe(2);
    expect(parsed.chromaKey).toEqual(SETTINGS);
    expect(parsed.spriteSheet.outputColumns).toBe(8);
  });

  it('round-trips animation settings', () => {
    const json = serializeProjectPreset(SETTINGS, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      animationName: 'walk',
      animationStartFrame: 2,
      animationEndFrame: 5,
      animationFps: 12,
      animations: [
        {
          id: 'walk',
          name: 'walk',
          startFrame: 2,
          endFrame: 5,
          fps: 12,
          loop: true,
          pingPong: true,
        },
      ],
      activeAnimationId: 'walk',
      animationPingPong: true,
    });
    const parsed = parseProjectPreset(json);
    expect(parsed.spriteSheet.animationName).toBe('walk');
    expect(parsed.spriteSheet.animationStartFrame).toBe(2);
    expect(parsed.spriteSheet.animationEndFrame).toBe(5);
    expect(parsed.spriteSheet.animationFps).toBe(12);
    expect(parsed.spriteSheet.animationPingPong).toBe(true);
  });

  it('round-trips multiple named animations', () => {
    const json = serializeProjectPreset(SETTINGS, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      animations: [
        {
          id: 'idle',
          name: 'idle',
          startFrame: 1,
          endFrame: 2,
          fps: 8,
          loop: true,
          pingPong: false,
        },
        {
          id: 'attack',
          name: 'attack',
          startFrame: 3,
          endFrame: 5,
          fps: 12,
          loop: false,
          pingPong: true,
        },
      ],
      activeAnimationId: 'attack',
    });
    const parsed = parseProjectPreset(json);
    expect(parsed.spriteSheet.animations).toHaveLength(2);
    expect(parsed.spriteSheet.activeAnimationId).toBe('attack');
    expect(parsed.spriteSheet.animationName).toBe('attack');
  });

  it('round-trips manual frame corrections', () => {
    const json = serializeProjectPreset(SETTINGS, {
      ...DEFAULT_SPRITESHEET_SETTINGS,
      manualFrames: [
        {
          id: 'manual-1',
          sourceIndex: 2,
          name: 'attack_01',
          offsetX: 4,
          offsetY: -2,
          locked: true,
        },
      ],
    });
    const parsed = parseProjectPreset(json);
    expect(parsed.spriteSheet.manualFrames).toEqual([
      {
        id: 'manual-1',
        sourceIndex: 2,
        name: 'attack_01',
        offsetX: 4,
        offsetY: -2,
        locked: true,
      },
    ]);
  });

  it('does not accept mask-only presets as project presets', () => {
    const json = serializePreset(SETTINGS);
    expect(() => parseProjectPreset(json)).toThrow(/mask-only/);
  });
});
