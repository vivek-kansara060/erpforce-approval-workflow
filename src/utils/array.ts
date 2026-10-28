/**
 * A copy of `list` with the item at `from` moved to `to`.
 *
 * Returns the same array when the move is a no-op or out of range, so a state
 * setter given the result does not re-render for nothing.
 */
export const moveItem = <T,>(list: readonly T[], from: number, to: number): T[] => {
  const inRange = (index: number) => Number.isInteger(index) && index >= 0 && index < list.length;
  if (from === to || !inRange(from) || !inRange(to)) return list as T[];

  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
