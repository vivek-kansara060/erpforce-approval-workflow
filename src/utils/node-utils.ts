import { DEFAULT_EDGE_STYLE, FAIL_EDGE_STYLE, PASS_EDGE_STYLE } from '../constants/defaults';
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

/** Block types that can be copied: the ones a user adds, not Pass/Fail or the trigger. */
const DUPLICABLE_TYPES: ReadonlySet<PersistedNodeType> = new Set(['criteria', 'action']);

export const isDuplicable = (node: Pick<WorkflowNode, 'type'> | undefined): boolean =>
  Boolean(node && DUPLICABLE_TYPES.has(node.type));

const cloneData = <T>(data: T): T => JSON.parse(JSON.stringify(data)) as T;

/**
 * Copies a criteria or action block, with everything beneath it, as a sibling
 * hanging off the same parent.
 *
 * Every node and edge in the copy gets a fresh id and the copy's `parentId`s are
 * remapped onto it, so the two subtrees share nothing: `data` is deep-copied, so
 * editing one block's stages never changes the other's. Only the copied block's
 * label is touched (`labelSuffix` appended), so the pair can be told apart.
 * Layout is re-run for the whole tree, as it is after any other addition.
 *
 * Returns `null` when the node cannot be duplicated (not a criteria or action,
 * or not connected to a parent).
 */
export const duplicateSubtree = (
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  labelSuffix = ' (copy)',
): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; rootId: string } | null => {
  const root = nodes.find((node) => node.id === nodeId);
  if (!root || !isDuplicable(root)) return null;

  const incoming =
    edges.find((edge) => edge.target === nodeId && edge.source === root.parentId) ??
    edges.find((edge) => edge.target === nodeId);
  if (!incoming) return null;

  const copiedIds = new Set([nodeId, ...findDescendantIds(nodeId, edges)]);
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const idMap = new Map<string, string>();
  const pairs: Array<{ original: WorkflowNode; copy: WorkflowNode }> = [];
  for (const id of copiedIds) {
    const original = byId.get(id);
    if (!original) continue;
    const copy = createNode({
      type: original.type,
      data: cloneData(original.data),
      position: { ...original.position },
    });
    idMap.set(id, copy.id);
    pairs.push({ original, copy });
  }

  const rootCopyId = idMap.get(nodeId) as string;
  const remappedNodes: WorkflowNode[] = pairs.map(({ original, copy }) => {
    if (copy.id !== rootCopyId) {
      return { ...copy, parentId: idMap.get(original.parentId ?? '') };
    }
    // The copied block stays under the original's parent; only its label changes.
    const label = (copy.data as { label?: string }).label ?? '';
    return {
      ...copy,
      parentId: original.parentId,
      data: { ...copy.data, label: `${label}${labelSuffix}` } as WorkflowNodeData,
    };
  });

  const copiedEdges: WorkflowEdge[] = [
    // The way in: same parent, same handle and style, new target.
    createEdge({
      source: incoming.source,
      target: rootCopyId,
      sourceHandle: incoming.sourceHandle ?? undefined,
      targetHandle: incoming.targetHandle ?? undefined,
      type: incoming.type,
      style: incoming.style ? { ...incoming.style } : undefined,
    }),
    // Everything inside the subtree, rewired between the copies.
    ...edges
      .filter((edge) => copiedIds.has(edge.source) && copiedIds.has(edge.target))
      .map((edge) =>
        createEdge({
          source: idMap.get(edge.source) as string,
          target: idMap.get(edge.target) as string,
          sourceHandle: edge.sourceHandle ?? undefined,
          targetHandle: edge.targetHandle ?? undefined,
          type: edge.type,
          style: edge.style ? { ...edge.style } : undefined,
          label: edge.label,
        }),
      ),
  ];

  const laidOut = getLayoutedElements([...nodes, ...remappedNodes], [...edges, ...copiedEdges]);
  return { ...laidOut, rootId: rootCopyId };
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
    node.id === nodeId ? ({ ...node, data: { ...node.data, ...patch } } as WorkflowNode) : node,
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
