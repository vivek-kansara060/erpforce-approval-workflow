import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addActionNode,
  addCriteriaNode,
  createTriggerNode,
  deleteNodeWithChildren,
  updateNodeData,
} from '../utils/node-utils';
import type {
  ActionNodeData,
  CriteriaNodeData,
  Viewport,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeData,
} from '../types/graph';

export type SidebarKind = 'trigger' | 'criteria' | 'action';

export interface SidebarState {
  isOpen: boolean;
  kind: SidebarKind | null;
  /** Id of the node being edited, or a synthetic id for a node not yet created. */
  nodeId: string | null;
  parentNodeId: string | null;
}

const CLOSED_SIDEBAR: SidebarState = {
  isOpen: false,
  kind: null,
  nodeId: null,
  parentNodeId: null,
};

export interface UseWorkflowGraphOptions {
  initialGraph?: WorkflowGraph | null;
  /** Label and entity for the auto-created trigger node of a new workflow. */
  trigger: { label: string; entityType: string; module: string };
  onChange?: (graph: WorkflowGraph) => void;
  readOnly?: boolean;
}

/**
 * Owns the builder's graph.
 *
 * Extracted from the component so the branching rules (a criteria node always
 * gets Pass/Fail children, deleting a node removes its whole subtree, the
 * trigger cannot be deleted) are unit-testable and the canvas component is
 * presentation only.
 */
export const useWorkflowGraph = (options: UseWorkflowGraphOptions) => {
  const { initialGraph, trigger, onChange, readOnly = false } = options;

  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [sidebar, setSidebar] = useState<SidebarState>(CLOSED_SIDEBAR);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const viewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 });
  const initializedRef = useRef(false);

  // onChange is frequently an inline arrow; hold it in a ref so emitting a
  // change never re-creates every callback below.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  /**
   * The graph as of the last render, read by the callbacks below instead of
   * closing over `nodes` / `edges`.
   *
   * Depending on them re-created every callback on every drag frame; the node
   * toolbar handlers are among them, so each frame rebuilt every node's data
   * and re-rendered the whole canvas. Reading the latest render's graph gives
   * the callbacks exactly the values their closures used to see, with a stable
   * identity.
   */
  const graphRef = useRef({ nodes, edges });
  graphRef.current = { nodes, edges };

  const emit = useCallback((nextNodes: WorkflowNode[], nextEdges: WorkflowEdge[]) => {
    onChangeRef.current?.({
      nodes: nextNodes,
      edges: nextEdges,
      viewport: viewportRef.current,
    });
  }, []);

  const commit = useCallback(
    (nextNodes: WorkflowNode[], nextEdges: WorkflowEdge[]) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
      emit(nextNodes, nextEdges);
    },
    [emit],
  );

  /**
   * Seeds the canvas exactly once. Re-seeding on every `initialGraph` identity
   * change was what made the original revert the user's manual edits, so it
   * guarded with a ref; the guard is kept, but the dependency is the graph's
   * presence rather than its identity.
   */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (initialGraph?.nodes?.length) {
      setNodes(initialGraph.nodes);
      setEdges(initialGraph.edges ?? []);
      if (initialGraph.viewport) viewportRef.current = initialGraph.viewport;
      return;
    }

    setNodes([createTriggerNode(trigger)]);
    setEdges([]);
    // Intentionally seeded once; see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSidebarForNode = useCallback((nodeId: string) => {
    const node = graphRef.current.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;

    const kind: SidebarKind =
      node.type === 'trigger'
        ? 'trigger'
        : node.type === 'criteria'
          ? 'criteria'
          : // Result branches are edited as the action that follows them.
            'action';

    setSidebar({ isOpen: true, kind, nodeId, parentNodeId: null });
  }, []);

  const openCriteriaSidebar = useCallback((parentNodeId: string) => {
    setSidebar({
      isOpen: true,
      kind: 'criteria',
      nodeId: `new-criteria-${Date.now()}`,
      parentNodeId,
    });
  }, []);

  const openActionSidebar = useCallback((parentNodeId: string) => {
    setSidebar({
      isOpen: true,
      kind: 'action',
      nodeId: `new-action-${Date.now()}`,
      parentNodeId,
    });
  }, []);

  const closeSidebar = useCallback(() => setSidebar(CLOSED_SIDEBAR), []);

  const activeNodeData = useMemo<WorkflowNodeData | null>(() => {
    if (!sidebar.nodeId) return null;
    return nodes.find((node) => node.id === sidebar.nodeId)?.data ?? null;
  }, [sidebar.nodeId, nodes]);

  /** Saves an existing node, or creates a new branch under `parentNodeId`. */
  const saveNode = useCallback(
    (
      nodeId: string,
      data: WorkflowNodeData,
      branch?: { parentNodeId: string; kind: 'criteria' | 'action' },
    ) => {
      const { nodes, edges } = graphRef.current;
      const exists = nodes.some((node) => node.id === nodeId);

      if (exists) {
        const nextNodes = updateNodeData(nodeId, data, nodes);
        commit(nextNodes, edges);
      } else if (branch?.parentNodeId) {
        const result =
          branch.kind === 'criteria'
            ? addCriteriaNode(branch.parentNodeId, nodes, edges, data as CriteriaNodeData)
            : addActionNode(branch.parentNodeId, nodes, edges, data as ActionNodeData);
        commit(result.nodes, result.edges);
      }

      closeSidebar();
    },
    [commit, closeSidebar],
  );

  const requestDelete = useCallback((nodeId: string): { blocked: boolean; reason?: string } => {
    const node = graphRef.current.nodes.find((candidate) => candidate.id === nodeId);
    if (node?.type === 'trigger') {
      return { blocked: true, reason: 'The trigger node cannot be deleted.' };
    }
    setPendingDeleteId(nodeId);
    return { blocked: false };
  }, []);

  const cancelDelete = useCallback(() => setPendingDeleteId(null), []);

  const confirmDelete = useCallback((): { hadChildren: boolean } | null => {
    if (!pendingDeleteId) return null;

    const { nodes, edges } = graphRef.current;
    const result = deleteNodeWithChildren(pendingDeleteId, nodes, edges);
    commit(result.nodes, result.edges);
    setPendingDeleteId(null);
    return { hadChildren: result.hadChildren };
  }, [pendingDeleteId, commit]);

  const setViewport = useCallback(
    (viewport: Viewport) => {
      viewportRef.current = viewport;
      const { nodes, edges } = graphRef.current;
      emit(nodes, edges);
    },
    [emit],
  );

  const moveNode = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const { nodes, edges } = graphRef.current;
      commit(
        nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
        edges,
      );
    },
    [commit],
  );

  const connect = useCallback(
    (edge: WorkflowEdge) => {
      if (readOnly) return;
      const { nodes, edges } = graphRef.current;
      commit(nodes, [...edges, edge]);
    },
    [readOnly, commit],
  );

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    sidebar,
    activeNodeData,
    pendingDeleteId,

    openSidebarForNode,
    openCriteriaSidebar,
    openActionSidebar,
    closeSidebar,
    saveNode,

    requestDelete,
    cancelDelete,
    confirmDelete,

    setViewport,
    moveNode,
    connect,
    viewportRef,
  };
};
