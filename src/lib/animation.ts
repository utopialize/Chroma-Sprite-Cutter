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
