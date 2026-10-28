import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWorkflowGraph } from '../useWorkflowGraph';
import { transformGraphForApi } from '../../utils/graph-transform';
import type { ResultNodeData, WorkflowGraph } from '../../types/graph';
import type { ApproverStage } from '../../types/approver';

const trigger = { label: 'Leave', entityType: 'leave_requests', module: 'hrms' };

describe('useWorkflowGraph', () => {
  it('seeds a trigger node for a new workflow', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger }));

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].type).toBe('trigger');
    expect(result.current.nodes[0].data).toMatchObject({ trigger: 'leave_requests' });
  });

  it('seeds from an existing graph instead', () => {
    const initialGraph: WorkflowGraph = {
      nodes: [
        {
          id: 't1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: { label: 'Existing', trigger: 'leave_requests' },
        },
      ],
      edges: [],
      viewport: { x: 5, y: 5, zoom: 1.2 },
    };

    const { result } = renderHook(() => useWorkflowGraph({ trigger, initialGraph }));

    expect(result.current.nodes[0].id).toBe('t1');
    expect(result.current.viewportRef.current).toEqual({ x: 5, y: 5, zoom: 1.2 });
  });

  it('does not re-seed when initialGraph changes identity', () => {
    const initialGraph: WorkflowGraph = {
      nodes: [
        {
          id: 't1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: { label: 'Existing', trigger: 'leave_requests' },
        },
      ],
      edges: [],
    };

    const { result, rerender } = renderHook(
      (props: { initialGraph: WorkflowGraph }) =>
        useWorkflowGraph({ trigger, initialGraph: props.initialGraph }),
      { initialProps: { initialGraph } },
    );

    act(() => result.current.openCriteriaSidebar('t1'));
    act(() =>
      result.current.saveNode(result.current.sidebar.nodeId as string, {
        label: 'Criteria',
        conditions: [],
      }, { parentNodeId: 't1', kind: 'criteria' }),
    );

    expect(result.current.nodes.length).toBeGreaterThan(1);

    // A new object with the same content: the user's edits must survive.
    rerender({ initialGraph: { ...initialGraph, nodes: [...initialGraph.nodes] } });
    expect(result.current.nodes.length).toBeGreaterThan(1);
  });

  it('emits the full graph on every mutation', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useWorkflowGraph({ trigger, onChange }));
    const rootId = result.current.nodes[0].id;

    act(() => result.current.openCriteriaSidebar(rootId));
    act(() =>
      result.current.saveNode(
        result.current.sidebar.nodeId as string,
        { label: 'Criteria', conditions: [] },
        { parentNodeId: rootId, kind: 'criteria' },
      ),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ nodes: expect.any(Array), edges: expect.any(Array) }),
    );
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0].nodes).toHaveLength(4);
  });

  it('edits an existing node rather than creating a second one', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger }));
    const rootId = result.current.nodes[0].id;

    act(() => result.current.openSidebarForNode(rootId));
    expect(result.current.sidebar).toMatchObject({ kind: 'trigger', nodeId: rootId });

    act(() =>
      result.current.saveNode(rootId, {
        label: 'Renamed',
        trigger: 'leave_requests',
      }),
    );

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].data.label).toBe('Renamed');
  });

  it('opens the action sidebar for a result branch', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger }));
    const rootId = result.current.nodes[0].id;

    act(() => result.current.openCriteriaSidebar(rootId));
    act(() =>
      result.current.saveNode(
        result.current.sidebar.nodeId as string,
        { label: 'Criteria', conditions: [] },
        { parentNodeId: rootId, kind: 'criteria' },
      ),
    );

    const passNode = result.current.nodes.find(
      (node) => node.type === 'criteriaResult',
    );

    act(() => result.current.openSidebarForNode(passNode?.id as string));
    expect(result.current.sidebar.kind).toBe('action');
  });

  it('refuses to delete the trigger node', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger }));
    const rootId = result.current.nodes[0].id;

    let outcome: { blocked: boolean; reason?: string } | undefined;
    act(() => {
      outcome = result.current.requestDelete(rootId);
    });

    expect(outcome?.blocked).toBe(true);
    expect(result.current.pendingDeleteId).toBeNull();
  });

  it('deletes a node together with its branches', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger }));
    const rootId = result.current.nodes[0].id;

    act(() => result.current.openCriteriaSidebar(rootId));
    act(() =>
      result.current.saveNode(
        result.current.sidebar.nodeId as string,
        { label: 'Criteria', conditions: [] },
        { parentNodeId: rootId, kind: 'criteria' },
      ),
    );

    const criteriaId = result.current.nodes.find((node) => node.type === 'criteria')?.id as string;

    act(() => {
      result.current.requestDelete(criteriaId);
    });
    expect(result.current.pendingDeleteId).toBe(criteriaId);

    let outcome: { hadChildren: boolean } | null = null;
    act(() => {
      outcome = result.current.confirmDelete();
    });

    expect(outcome).toEqual({ hadChildren: true });
    expect(result.current.nodes).toHaveLength(1);
  });

  it('cancelling a delete leaves the graph untouched', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger }));
    const rootId = result.current.nodes[0].id;

    act(() => result.current.openCriteriaSidebar(rootId));
    act(() =>
      result.current.saveNode(
        result.current.sidebar.nodeId as string,
        { label: 'Criteria', conditions: [] },
        { parentNodeId: rootId, kind: 'criteria' },
      ),
    );

    const criteriaId = result.current.nodes.find((node) => node.type === 'criteria')?.id as string;
    const before = result.current.nodes.length;

    act(() => {
      result.current.requestDelete(criteriaId);
    });
    act(() => result.current.cancelDelete());

    expect(result.current.pendingDeleteId).toBeNull();
    expect(result.current.nodes).toHaveLength(before);
  });
});

describe('actions configured on a Pass/Fail branch', () => {
  const stage = (value: string): ApproverStage => ({
    action_type_ref: { id: `act_${value}`, value, label: value },
    config: {
      approver_type: 'USER',
      approver_ids: [3],
      approval_message: '',
      auto_approve_enabled: false,
      auto_approve_value: 0,
      auto_approve_unit: '',
    },
    module: 'hrms',
  });

  /** A saved workflow: trigger → criteria → Pass branch carrying one action. */
  const savedGraph = (): WorkflowGraph => ({
    nodes: [
      {
        id: 't1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Leave', trigger: 'leave_requests' },
      },
      {
        id: 'c1',
        type: 'criteria',
        position: { x: 250, y: 0 },
        data: { label: 'Long leave', conditions: [] },
      },
      {
        id: 'p1',
        type: 'criteriaResult',
        position: { x: 500, y: -150 },
        parentId: 'c1',
        data: { label: 'Approval', resultType: 'pass', action: [stage('request_approval')] },
      },
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'c1' },
      { id: 'e2', source: 'c1', target: 'p1', sourceHandle: 'pass' },
    ],
  });

  const branchOf = (graph: WorkflowGraph) =>
    graph.nodes.find((node) => node.id === 'p1')?.data as ResultNodeData;

  /** The graph from the most recent `onChange`. (`Array.at` needs ES2022.) */
  const lastEmitted = (onChange: ReturnType<typeof vi.fn>): WorkflowGraph =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0] as WorkflowGraph;

  it('opens an existing branch in the action sidebar with its stages', () => {
    const { result } = renderHook(() =>
      useWorkflowGraph({ trigger, initialGraph: savedGraph() }),
    );

    act(() => result.current.openSidebarForNode('p1'));

    expect(result.current.sidebar.kind).toBe('action');
    expect((result.current.activeNodeData as ResultNodeData).action).toEqual([
      stage('request_approval'),
    ]);
  });

  it('emits a graph whose payload keeps a newly added action', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowGraph({ trigger, initialGraph: savedGraph(), onChange }),
    );

    act(() => result.current.openSidebarForNode('p1'));
    act(() =>
      result.current.saveNode('p1', {
        label: 'Approval',
        action: [stage('request_approval'), stage('send_email')],
      }),
    );

    const emitted = lastEmitted(onChange);
    const persisted = branchOf(transformGraphForApi(emitted));

    expect(persisted.action).toHaveLength(2);
    expect(persisted.resultType).toBe('pass');
  });

  it('keeps a modified action key', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowGraph({ trigger, initialGraph: savedGraph(), onChange }),
    );

    act(() =>
      result.current.saveNode('p1', { label: 'Approval', action: [stage('send_notification')] }),
    );

    const emitted = lastEmitted(onChange);
    const persisted = branchOf(transformGraphForApi(emitted));

    expect(
      (persisted.action?.[0].action_type_ref as { value: string }).value,
    ).toBe('send_notification');
  });

  it('persists the removal of every action', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowGraph({ trigger, initialGraph: savedGraph(), onChange }),
    );

    act(() => result.current.saveNode('p1', { label: 'Approval', action: [] }));

    const emitted = lastEmitted(onChange);

    expect(branchOf(transformGraphForApi(emitted)).action).toEqual([]);
  });

  it('leaves the branch marker intact when actions are saved onto it', () => {
    const { result } = renderHook(() =>
      useWorkflowGraph({ trigger, initialGraph: savedGraph() }),
    );

    act(() =>
      result.current.saveNode('p1', { label: 'Approval', action: [stage('send_email')] }),
    );

    expect(result.current.nodes.find((node) => node.id === 'p1')?.data).toMatchObject({
      resultType: 'pass',
      label: 'Approval',
    });
  });

  // Uses this block's saved graph; the behaviour is the hook's, not the branch's.
  it('keeps the node-toolbar callbacks stable while nodes move', () => {
    // These feed every canvas node's data; a new identity per drag frame
    // re-rendered the whole canvas.
    const { result } = renderHook(() => useWorkflowGraph({ trigger, initialGraph: savedGraph() }));
    const before = result.current;

    act(() => result.current.moveNode('p1', { x: 900, y: 40 }));

    expect(result.current.nodes.find((node) => node.id === 'p1')?.position).toEqual({
      x: 900,
      y: 40,
    });
    expect(result.current.openSidebarForNode).toBe(before.openSidebarForNode);
    expect(result.current.requestDelete).toBe(before.requestDelete);
    expect(result.current.saveNode).toBe(before.saveNode);
    expect(result.current.moveNode).toBe(before.moveNode);
  });

  it('acts on the latest graph through its stable callbacks', () => {
    const { result } = renderHook(() => useWorkflowGraph({ trigger, initialGraph: savedGraph() }));

    act(() => result.current.moveNode('p1', { x: 10, y: 20 }));
    act(() => result.current.openSidebarForNode('p1'));

    expect(result.current.sidebar).toMatchObject({ isOpen: true, kind: 'action', nodeId: 'p1' });
    expect(result.current.nodes.find((node) => node.id === 'p1')?.position).toEqual({
      x: 10,
      y: 20,
    });
  });

  describe('undo / redo', () => {
    const addCriteria = (result: { current: ReturnType<typeof useWorkflowGraph> }) => {
      const rootId = result.current.nodes[0].id;
      act(() => result.current.openCriteriaSidebar(rootId));
      act(() =>
        result.current.saveNode(
          result.current.sidebar.nodeId as string,
          { label: 'Criteria', conditions: [] },
          { parentNodeId: rootId, kind: 'criteria' },
        ),
      );
    };

    it('steps back and forward through an edit, emitting each state', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useWorkflowGraph({ trigger, onChange }));
      expect(result.current.canUndo).toBe(false);

      addCriteria(result);
      expect(result.current.nodes).toHaveLength(4);
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.undo());
      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.canRedo).toBe(true);
      expect(onChange.mock.calls.at(-1)?.[0].nodes).toHaveLength(1);

      act(() => result.current.redo());
      expect(result.current.nodes).toHaveLength(4);
      expect(result.current.canRedo).toBe(false);
    });

    it('drops the redo stack when a new edit is made', () => {
      const { result } = renderHook(() => useWorkflowGraph({ trigger }));
      addCriteria(result);
      act(() => result.current.undo());
      expect(result.current.canRedo).toBe(true);

      addCriteria(result);
      expect(result.current.canRedo).toBe(false);
    });

    it('does not record a drag as an edit', () => {
      const { result } = renderHook(() => useWorkflowGraph({ trigger }));
      act(() => result.current.moveNode(result.current.nodes[0].id, { x: 40, y: 40 }));
      expect(result.current.canUndo).toBe(false);
    });

    it('closes an open drawer when stepping, so it cannot edit a removed node', () => {
      const { result } = renderHook(() => useWorkflowGraph({ trigger }));
      addCriteria(result);
      act(() => result.current.openSidebarForNode(result.current.nodes[1].id));
      expect(result.current.sidebar.isOpen).toBe(true);

      act(() => result.current.undo());
      expect(result.current.sidebar.isOpen).toBe(false);
    });
  });

  describe('duplicateNode', () => {
    it('copies a block with its branches and can be undone', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useWorkflowGraph({ trigger, onChange }));
      const rootId = result.current.nodes[0].id;

      act(() => result.current.openCriteriaSidebar(rootId));
      act(() =>
        result.current.saveNode(
          result.current.sidebar.nodeId as string,
          { label: 'Large order', conditions: [] },
          { parentNodeId: rootId, kind: 'criteria' },
        ),
      );
      const criteria = result.current.nodes.find((node) => node.type === 'criteria');

      act(() => result.current.duplicateNode(criteria?.id as string, ' (copy)'));

      expect(result.current.nodes).toHaveLength(7);
      expect(
        result.current.nodes.some(
          (node) => (node.data as { label: string }).label === 'Large order (copy)',
        ),
      ).toBe(true);
      expect(onChange.mock.calls.at(-1)?.[0].nodes).toHaveLength(7);

      act(() => result.current.undo());
      expect(result.current.nodes).toHaveLength(4);
    });

    it('ignores the trigger', () => {
      const { result } = renderHook(() => useWorkflowGraph({ trigger }));
      act(() => result.current.duplicateNode(result.current.nodes[0].id));
      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.canUndo).toBe(false);
    });
  });
});
