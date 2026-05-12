import type {
  SpriteSheetAnimationClip,
  SpriteSheetSettings,
} from '../types/spriteSheet';

export function createAnimationClip(
  partial: Partial<SpriteSheetAnimationClip> = {},
): SpriteSheetAnimationClip {
  return {
    id: partial.id ?? `anim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name ?? 'default',
    startFrame: partial.startFrame ?? 1,
    endFrame: partial.endFrame ?? 1,
    fps: partial.fps ?? 8,
    loop: partial.loop ?? true,
    pingPong: partial.pingPong ?? false,
  };
}

export function getAnimationClips(
  settings: SpriteSheetSettings,
): SpriteSheetAnimationClip[] {
  if (settings.animations.length > 0) return settings.animations;
  return [
    createAnimationClip({
      id: 'legacy-default',
      name: settings.animationName,
      startFrame: settings.animationStartFrame,
      endFrame: settings.animationEndFrame,
      fps: settings.animationFps,
      loop: settings.animationLoop,
      pingPong: settings.animationPingPong,
    }),
  ];
}

export function getActiveAnimation(
  settings: SpriteSheetSettings,
): SpriteSheetAnimationClip {
  const clips = getAnimationClips(settings);
  return (
    clips.find((clip) => clip.id === settings.activeAnimationId) ??
    clips[0] ??
    createAnimationClip()
  );
}

export function syncLegacyAnimationFields(
  settings: SpriteSheetSettings,
  activeClip?: SpriteSheetAnimationClip,
): SpriteSheetSettings {
  const clip = activeClip ?? getActiveAnimation(settings);
  return {
    ...settings,
    animationName: clip.name,
    animationStartFrame: clip.startFrame,
    animationEndFrame: clip.endFrame,
    animationFps: clip.fps,
    animationLoop: clip.loop,
    animationPingPong: clip.pingPong,
  };
}

export function ensureAnimationSettings(
  settings: SpriteSheetSettings,
): SpriteSheetSettings {
  const clips = getAnimationClips(settings);
  const active =
    clips.find((clip) => clip.id === settings.activeAnimationId) ?? clips[0];
  return syncLegacyAnimationFields({
    ...settings,
    animations: clips,
    activeAnimationId: active?.id ?? null,
  }, active);
}
