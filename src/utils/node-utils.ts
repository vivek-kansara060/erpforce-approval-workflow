import {
  DEFAULT_EDGE_STYLE,
  FAIL_EDGE_STYLE,
  PASS_EDGE_STYLE,
} from '../constants/defaults';
import { getInitialNodePosition, getLayoutedElements } from './layout-utils';
import type {
  ActionNodeData,
  CriteriaNodeData,
  NodePosition,
  PersistedNodeType,
  ResultNodeData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
} from '../types/graph';

/** Counter guarantees uniqueness even when two nodes are created in one tick. */
let sequence = 0;

export const generateNodeId = (type: PersistedNodeType): string =>
  `${type}-${Date.now()}-${(sequence++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const generateEdgeId = (source: string, target: string): string =>
  `edge-${source}-${target}`;

export const createNode = <TData extends WorkflowNodeData>(input: {
  type: PersistedNodeType;
  data: TData;
  existingNodes?: WorkflowNode[];
  position?: NodePosition;
  parentId?: string;
}): WorkflowNode<TData> => ({
  id: generateNodeId(input.type),
  type: input.type,
  position: input.position ?? getInitialNodePosition(input.existingNodes ?? []),
  parentId: input.parentId,
  data: input.data,
});

export const createEdge = (input: {
  source: string;
  target: string;
  label?: string;
  style?: Record<string, string | number>;
  type?: string;
  sourceHandle?: string;
  targetHandle?: string;
}): WorkflowEdge => ({
  id: generateEdgeId(input.source, input.target),
  source: input.source,
  target: input.target,
  label: input.label,
  style: input.style ?? { ...DEFAULT_EDGE_STYLE },
  type: input.type ?? 'smoothstep',
  sourceHandle: input.sourceHandle,
  targetHandle: input.targetHandle,
});

/**
 * All descendants of a node.
 *
 * Iterative with a visited set: the original recursed and would stack-overflow
 * on a cyclic graph, which a user can create by dragging an edge back to an
 * ancestor. The adjacency is built once, so the walk is O(nodes + edges)
 * rather than a scan of every edge per visited node.
 */
export const findDescendantIds = (nodeId: string, edges: WorkflowEdge[]): string[] => {
  const targetsOf = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = targetsOf.get(edge.source);
    if (targets) targets.push(edge.target);
    else targetsOf.set(edge.source, [edge.target]);
  }

  const descendants: string[] = [];
  const visited = new Set<string>([nodeId]);
  const queue = [...(targetsOf.get(nodeId) ?? [])];

  // Breadth-first, with an index instead of `shift()` so dequeuing is O(1).
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (visited.has(current)) continue;
    visited.add(current);
    descendants.push(current);
    for (const target of targetsOf.get(current) ?? []) {
      if (!visited.has(target)) queue.push(target);
    }
  }

  return descendants;
};

export const deleteNodeWithChildren = (
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; removedCount: number; hadChildren: boolean } => {
  const descendants = findDescendantIds(nodeId, edges);
  const removed = new Set([nodeId, ...descendants]);

  return {
    nodes: nodes.filter((node) => !removed.has(node.id)),
    edges: edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
    removedCount: removed.size,
    hadChildren: descendants.length > 0,
  };
};

/** Shared implementation for the criteria and action branches. */
const addBranchingNode = (
  branchType: 'criteria' | 'action',
  parentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  data: CriteriaNodeData | ActionNodeData,
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => {
  const resultType: PersistedNodeType =
    branchType === 'criteria' ? 'criteriaResult' : 'actionResult';

  // All three are created at the origin: `getLayoutedElements` below assigns
  // every node its real position from the tree's shape. The branches used to
  // carry hard-coded absolute coordinates, which put every criteria's Pass and
  // Fail on the same two spots on the canvas regardless of where their parent
  // sat.
  const origin = { x: 0, y: 0 };

  const branchNode = createNode({
    type: branchType,
    data,
    parentId: parentNodeId,
    position: origin,
  });

  const passNode = createNode<ResultNodeData>({
    type: resultType,
    data: { label: 'Pass', resultType: 'pass' },
    parentId: branchNode.id,
    position: origin,
  });

  const failNode = createNode<ResultNodeData>({
    type: resultType,
    data: { label: 'Fail', resultType: 'fail' },
    parentId: branchNode.id,
    position: origin,
  });

  const nextNodes = [...nodes, branchNode, passNode, failNode];
  const nextEdges = [
    ...edges,
    createEdge({ source: parentNodeId, target: branchNode.id }),
    createEdge({
      source: branchNode.id,
      target: passNode.id,
      sourceHandle: 'pass',
      style: { ...PASS_EDGE_STYLE },
    }),
    createEdge({
      source: branchNode.id,
      target: failNode.id,
      sourceHandle: 'fail',
      style: { ...FAIL_EDGE_STYLE },
    }),
  ];

  return getLayoutedElements(nextNodes, nextEdges);
};

/** Adds a criteria node with its automatic Pass/Fail children. */
export const addCriteriaNode = (
  parentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  data: CriteriaNodeData,
) => addBranchingNode('criteria', parentNodeId, nodes, edges, data);

/** Adds an action node with its automatic Pass/Fail children. */
export const addActionNode = (
  parentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  data: ActionNodeData,
) => addBranchingNode('action', parentNodeId, nodes, edges, data);

export const updateNodeData = (
  nodeId: string,
  patch: Partial<WorkflowNodeData>,
  nodes: WorkflowNode[],
): WorkflowNode[] =>
  nodes.map((node) =>
    node.id === nodeId
      ? ({ ...node, data: { ...node.data, ...patch } } as WorkflowNode)
      : node,
  );

/** Creates the root trigger node for a brand-new workflow. */
export const createTriggerNode = (input: {
  label: string;
  entityType: string;
  module: string;
}): WorkflowNode => ({
  id: `trigger-${Date.now()}`,
  type: 'trigger',
  position: { x: 0, y: 0 },
  data: {
    label: input.label || 'Trigger',
    trigger: input.entityType,
    triggerId: input.entityType,
    event_type: 'onCreate',
    module: input.module,
  },
});

/** Exposed for tests so ids are reproducible. */
export const __resetNodeIdSequence = () => {
  sequence = 0;
};
