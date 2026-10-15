import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowNodes } from '../useFlowNodes';
import type { NodeCallbacks } from '../flow-types';
import type { WorkflowNode } from '../../../types/graph';

const node = (id: string, x = 0): WorkflowNode => ({
  id,
  type: 'trigger',
  position: { x, y: 0 },
  data: { label: id, trigger: 'leave_requests' },
});

const callbacks: NodeCallbacks = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onAddCriteria: vi.fn(),
  onAddAction: vi.fn(),
};

describe('useFlowNodes', () => {
  it('rebuilds only the node that changed', () => {
    const a = node('a');
    const b = node('b');
    const { result, rerender } = renderHook(
      (props: { nodes: WorkflowNode[] }) => useFlowNodes(props.nodes, callbacks),
      { initialProps: { nodes: [a, b] } },
    );
    const [flowA, flowB] = result.current;

    // `b` moved: a new object for it, the same object for `a`.
    rerender({ nodes: [a, { ...b, position: { x: 50, y: 0 } }] });

    expect(result.current[0]).toBe(flowA);
    expect(result.current[1]).not.toBe(flowB);
    expect(result.current[1].position).toEqual({ x: 50, y: 0 });
  });

  it('rebuilds every node when the callbacks change, since they live in node data', () => {
    const a = node('a');
    const { result, rerender } = renderHook(
      (props: { callbacks: NodeCallbacks | null }) => useFlowNodes([a], props.callbacks),
      { initialProps: { callbacks: callbacks as NodeCallbacks | null } },
    );
    const before = result.current[0];

    rerender({ callbacks: null });

    expect(result.current[0]).not.toBe(before);
    expect(result.current[0].data.onEdit).toBeUndefined();
    expect(result.current[0].draggable).toBe(false);
  });
});
