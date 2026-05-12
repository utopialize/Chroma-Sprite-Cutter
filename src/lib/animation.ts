export interface AnimationStep {
  index: number;
  direction: 1 | -1;
}

export function nextAnimationFrame(
  current: AnimationStep,
  frameCount: number,
  pingPong: boolean,
): AnimationStep {
  if (frameCount <= 1) return { index: 0, direction: 1 };

  const next = current.index + current.direction;
  if (!pingPong) {
    return {
      index: ((next % frameCount) + frameCount) % frameCount,
      direction: current.direction,
    };
  }

  if (next >= frameCount) {
    return { index: frameCount - 2, direction: -1 };
  }
  if (next < 0) {
    return { index: 1, direction: 1 };
  }
  return { index: next, direction: current.direction };
}

export function previousAnimationFrame(
  current: AnimationStep,
  frameCount: number,
): AnimationStep {
  if (frameCount <= 1) return { index: 0, direction: 1 };
  return {
    index: (current.index - 1 + frameCount) % frameCount,
    direction: -1,
  };
}

export function getAnimationFrameRange(
  frameCount: number,
  startFrame: number,
  endFrame: number,
): { startIndex: number; endIndex: number } {
  if (frameCount <= 0) return { startIndex: 0, endIndex: 0 };
  const start = clamp(Math.round(startFrame), 1, frameCount) - 1;
  const effectiveEnd = endFrame <= 0 ? frameCount : endFrame;
  const end = clamp(Math.round(effectiveEnd), 1, frameCount) - 1;
  return start <= end
    ? { startIndex: start, endIndex: end }
    : { startIndex: end, endIndex: start };
}

export function selectAnimationRange<T>(
  frames: T[],
  startFrame: number,
  endFrame: number,
): T[] {
  if (frames.length === 0) return [];
  const range = getAnimationFrameRange(frames.length, startFrame, endFrame);
  return frames.slice(range.startIndex, range.endIndex + 1);
}

export function buildPlaybackSequence<T>(frames: T[], pingPong: boolean): T[] {
  if (!pingPong || frames.length <= 2) return frames;
  return frames.concat(frames.slice(1, -1).reverse());
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
