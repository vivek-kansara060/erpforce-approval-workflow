import { describe, expect, it } from 'vitest';
import { moveItem } from '../array';

describe('moveItem', () => {
  it('moves an item up and down without touching the original', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(list, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('returns the same array for a no-op or an out-of-range move', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 2)).toBe(list);
  });
});
