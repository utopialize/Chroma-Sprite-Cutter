import { describe, expect, it } from 'vitest';
import {
  createAnimationClip,
  ensureAnimationSettings,
  getActiveAnimation,
  getAnimationClips,
} from './animationClips';
import { DEFAULT_SPRITESHEET_SETTINGS } from './spriteSheet';

describe('animationClips helpers', () => {
  it('derives a legacy default clip when no clip array exists', () => {
    const clips = getAnimationClips({
      ...DEFAULT_SPRITESHEET_SETTINGS,
      animations: [],
      activeAnimationId: null,
      animationName: 'walk',
      animationStartFrame: 2,
      animationEndFrame: 5,
      animationFps: 12,
      animationLoop: false,
      animationPingPong: true,
    });

    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({
      name: 'walk',
      startFrame: 2,
      endFrame: 5,
      fps: 12,
      loop: false,
      pingPong: true,
    });
  });

  it('returns the selected active clip', () => {
    const idle = createAnimationClip({ id: 'idle', name: 'idle' });
    const attack = createAnimationClip({ id: 'attack', name: 'attack' });
    const active = getActiveAnimation({
      ...DEFAULT_SPRITESHEET_SETTINGS,
      animations: [idle, attack],
      activeAnimationId: 'attack',
    });

    expect(active.name).toBe('attack');
  });

  it('materializes an active clip into the settings structure', () => {
    const settings = ensureAnimationSettings({
      ...DEFAULT_SPRITESHEET_SETTINGS,
      animations: [],
      activeAnimationId: null,
    });

    expect(settings.animations).toHaveLength(1);
    expect(settings.activeAnimationId).toBe(settings.animations[0].id);
    expect(settings.animationName).toBe(settings.animations[0].name);
  });
});
