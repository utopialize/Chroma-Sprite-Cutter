import { describe, expect, it } from 'vitest';
import { nextAnimationFrame, previousAnimationFrame } from './animation';

describe('animation frame helpers', () => {
  it('loops forward by default', () => {
    expect(nextAnimationFrame({ index: 2, direction: 1 }, 3, false)).toEqual({
      index: 0,
      direction: 1,
    });
  });

  it('bounces at the end in ping-pong mode', () => {
    expect(nextAnimationFrame({ index: 2, direction: 1 }, 3, true)).toEqual({
      index: 1,
      direction: -1,
    });
  });

  it('moves to the previous frame with wrap', () => {
    expect(previousAnimationFrame({ index: 0, direction: 1 }, 4)).toEqual({
      index: 3,
      direction: -1,
    });
  });
});
