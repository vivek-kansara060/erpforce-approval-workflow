import { describe, expect, it } from 'vitest';
import type { NodeChange } from '@xyflow/react';
import { applyTrackedNodeChanges } from '../flow-types';
import type { WorkflowNode } from '../../../types/graph';

const nodes = (): WorkflowNode[] => [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 0, y: 0 },
    selected: false,
    data: { label: 'Leave', trigger: 'leave', module: 'hrms' },
  } as WorkflowNode,
  {
    id: 'criteria-1',
    type: 'criteria',
    position: { x: 250, y: 0 },
    data: { label: 'Long leave', conditions: [] },
  } as WorkflowNode,
];

describe('applyTrackedNodeChanges', () => {
  it('records a position change', () => {
    const result = applyTrackedNodeChanges(nodes(), [
      { id: 'criteria-1', type: 'position', position: { x: 400, y: 120 } } as NodeChange,
    ]);

    expect(result[1].position).toEqual({ x: 400, y: 120 });
  });

  it('records a selection change', () => {
    const result = applyTrackedNodeChanges(nodes(), [
      { id: 'trigger-1', type: 'select', selected: true } as NodeChange,
    ]);

    expect(result[0].selected).toBe(true);
  });

  /**
   * The regression that made the canvas flicker and swallow node clicks: a
   * freshly created node has no `measured`, so React Flow measured it, the
   * measurement was written back as a new node object, and the new array sent
   * React Flow round again.
   */
  it('ignores measurement changes, returning the same array identity', () => {
    const input = nodes();
    const result = applyTrackedNodeChanges(input, [
      {
        id: 'trigger-1',
        type: 'dimensions',
        dimensions: { width: 96, height: 96 },
      } as NodeChange,
    ]);

    expect(result).toBe(input);
  });

  it('returns the same array when a tracked change is a no-op', () => {
    const input = nodes();
    const result = applyTrackedNodeChanges(input, [
      { id: 'trigger-1', type: 'position', position: { x: 0, y: 0 } } as NodeChange,
      { id: 'trigger-1', type: 'select', selected: false } as NodeChange,
    ]);

    expect(result).toBe(input);
  });

  it('applies a position and a selection change batched for the same node', () => {
    const result = applyTrackedNodeChanges(nodes(), [
      { id: 'trigger-1', type: 'position', position: { x: 60, y: 40 } } as NodeChange,
      { id: 'trigger-1', type: 'select', selected: true } as NodeChange,
    ]);

    expect(result[0].position).toEqual({ x: 60, y: 40 });
    expect(result[0].selected).toBe(true);
  });

  it('leaves untouched nodes at their previous identity', () => {
    const input = nodes();
    const result = applyTrackedNodeChanges(input, [
      { id: 'criteria-1', type: 'position', position: { x: 10, y: 10 } } as NodeChange,
    ]);

    expect(result).not.toBe(input);
    expect(result[0]).toBe(input[0]);
    expect(result[1]).not.toBe(input[1]);
  });
});
