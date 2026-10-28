import type { Edge, Node, NodeChange } from '@xyflow/react';
import type { WorkflowEdge, WorkflowNode, WorkflowNodeData } from '../../types/graph';

/**
 * Bridge between the package's serialisable graph model and React Flow.
 *
 * React Flow's `Node['data']` must be an index-signature record; the package's
 * node data are discriminated unions. Converting at this single boundary keeps
 * the unions intact everywhere else — the original widened every node to `any`
 * to get past this.
 */

/** Callbacks React Flow nodes invoke; injected into node data before render. */
export interface NodeCallbacks {
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddCriteria: (nodeId: string) => void;
  onAddAction: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
}

export type FlowNodeData = WorkflowNodeData & Partial<NodeCallbacks> & Record<string, unknown>;

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

export interface FlowNodeOptions {
  /** Type of the node's parent, so a Pass/Fail branch knows what it hangs off. */
  parentType?: string;
  /** Defaults to "has callbacks". A view-only canvas passes callbacks but not drag. */
  draggable?: boolean;
}

export const toFlowNode = (
  node: WorkflowNode,
  callbacks: Partial<NodeCallbacks> | null,
  options: FlowNodeOptions = {},
): FlowNode =>
  ({
    id: node.id,
    type: node.type,
    position: node.position,
    parentId: node.parentId ?? undefined,
    // React Flow re-parents children when `parentId` is set; the package uses
    // it only to describe graph ancestry, so it is passed through node data.
    data: callbacks
      ? ({
          ...node.data,
          ...callbacks,
          parentNodeId: node.parentId,
          parentType: options.parentType,
        } as FlowNodeData)
      : ({
          ...node.data,
          parentNodeId: node.parentId,
          parentType: options.parentType,
        } as FlowNodeData),
    measured: node.measured,
    selected: node.selected,
    draggable: options.draggable ?? Boolean(callbacks),
  }) as FlowNode;

export const toWorkflowNode = (node: FlowNode, original: WorkflowNode): WorkflowNode => ({
  ...original,
  position: node.position,
  selected: node.selected,
});

/**
 * Folds a React Flow change stream into the package's nodes.
 *
 * Only `position` and `select` are tracked, and the input array is returned
 * unchanged when nothing actually moved.
 *
 * Measurement (`dimensions`) changes are deliberately dropped. React Flow emits
 * one the first time it measures a node, and a node the user has just created
 * carries no `measured` value of its own. Writing that back produced a new node
 * object, hence a new `nodes` array, which sent React Flow back to measuring —
 * a render loop that made the canvas flicker and swallowed clicks on a node,
 * because the element was replaced between mousedown and mouseup. React Flow
 * keeps its own measurements, and `transformGraphForApi` falls back to
 * `LAYOUT.DEFAULT_MEASURED` when persisting, so the package needs no copy.
 */
export const applyTrackedNodeChanges = (
  nodes: WorkflowNode[],
  changes: NodeChange[],
): WorkflowNode[] => {
  // A batch can carry both a position and a selection change for the same node,
  // so patches are accumulated per id rather than taking the first match.
  const patches = new Map<string, Partial<WorkflowNode>>();

  for (const change of changes) {
    if (change.type !== 'position' && change.type !== 'select') continue;

    const patch = patches.get(change.id) ?? {};
    if (change.type === 'select') patch.selected = change.selected;
    else if (change.position) patch.position = change.position;
    patches.set(change.id, patch);
  }

  if (patches.size === 0) return nodes;

  let mutated = false;

  const next = nodes.map((node) => {
    const patch = patches.get(node.id);
    if (!patch) return node;

    const movedTo =
      patch.position &&
      (node.position?.x !== patch.position.x || node.position?.y !== patch.position.y)
        ? patch.position
        : undefined;
    const reselected =
      patch.selected !== undefined && node.selected !== patch.selected
        ? patch.selected
        : undefined;

    if (!movedTo && reselected === undefined) return node;

    mutated = true;
    return {
      ...node,
      ...(movedTo ? { position: movedTo } : null),
      ...(reselected !== undefined ? { selected: reselected } : null),
    };
  });

  return mutated ? next : nodes;
};

export const toFlowEdge = (edge: WorkflowEdge): FlowEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? undefined,
  targetHandle: edge.targetHandle ?? undefined,
  type: edge.type ?? 'smoothstep',
  label: edge.label,
  style: edge.style,
  markerEnd: edge.markerEnd as FlowEdge['markerEnd'],
});
