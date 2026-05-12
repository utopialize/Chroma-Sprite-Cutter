import { describe, expect, it } from 'vitest';
import {
  buildPlaybackSequence,
  getAnimationFrameRange,
  nextAnimationFrame,
  previousAnimationFrame,
  selectAnimationRange,
} from './animation';

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

  it('normalizes one-based animation ranges', () => {
    expect(getAnimationFrameRange(10, 2, 5)).toEqual({
      startIndex: 1,
      endIndex: 4,
    });
    expect(selectAnimationRange(['a', 'b', 'c', 'd'], 2, 3)).toEqual([
      'b',
      'c',
    ]);
  });

  it('builds a ping-pong playback sequence without duplicating endpoints', () => {
    expect(buildPlaybackSequence([1, 2, 3, 4], true)).toEqual([
      1,
      2,
      3,
      4,
      3,
      2,
    ]);
  });
});
