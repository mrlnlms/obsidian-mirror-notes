import { describe, it, expect } from 'vitest';
import { arraymove } from '../src/utils/array';

describe('arraymove', () => {
  it('moves element forward', () => {
    const arr = ['a', 'b', 'c', 'd'];
    arraymove(arr, 0, 2);
    expect(arr).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves element backward', () => {
    const arr = ['a', 'b', 'c', 'd'];
    arraymove(arr, 3, 1);
    expect(arr).toEqual(['a', 'd', 'b', 'c']);
  });

  it('no-ops when from === to', () => {
    const arr = ['a', 'b', 'c'];
    arraymove(arr, 1, 1);
    expect(arr).toEqual(['a', 'b', 'c']);
  });

  it('moves first to last', () => {
    const arr = [1, 2, 3];
    arraymove(arr, 0, 2);
    expect(arr).toEqual([2, 3, 1]);
  });

  it('moves last to first', () => {
    const arr = [1, 2, 3];
    arraymove(arr, 2, 0);
    expect(arr).toEqual([3, 1, 2]);
  });

  it('works with single-element array', () => {
    const arr = ['x'];
    arraymove(arr, 0, 0);
    expect(arr).toEqual(['x']);
  });

  it('mutates the original array', () => {
    const arr = ['a', 'b', 'c'];
    const ref = arr;
    arraymove(arr, 0, 2);
    expect(ref).toBe(arr);
    expect(ref).toEqual(['b', 'c', 'a']);
  });
});
