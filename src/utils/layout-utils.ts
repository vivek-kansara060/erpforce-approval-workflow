import { LAYOUT } from '../constants/defaults';
import type { NodePosition, ResultNodeData, WorkflowEdge, WorkflowNode } from '../types/graph';

const { NODE_WIDTH, NODE_HEIGHT, HORIZONTAL_SPACING, VERTICAL_SPACING } = LAYOUT;

/** Distance between the left edges of two adjacent columns / rows. */
const COLUMN_STRIDE = NODE_WIDTH + HORIZONTAL_SPACING;
const ROW_STRIDE = NODE_HEIGHT + VERTICAL_SPACING;

/** Pass branches render above their fail counterpart. */
const sortSiblings = (siblings: WorkflowNode[]): WorkflowNode[] =>
  [...siblings].sort((a, b) => {
    const aIsResult = a.type === 'criteriaResult' || a.type === 'actionResult';
    const bIsResult = b.type === 'criteriaResult' || b.type === 'actionResult';
    if (aIsResult && !bIsResult) return -1;
    if (!aIsResult && bIsResult) return 1;
    if (aIsResult && bIsResult) {
      const aIsPass = (a.data as ResultNodeData).resultType === 'pass';
      const bIsPass = (b.data as ResultNodeData).resultType === 'pass';
      if (aIsPass && !bIsPass) return -1;
      if (!aIsPass && bIsPass) return 1;
    }
    return 0;
  });

/** Children of each node, in the order they should be stacked. */
const buildChildIndex = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): Map<string, WorkflowNode[]> => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, WorkflowNode[]>();

  for (const edge of edges) {
    const child = byId.get(edge.target);
    if (!child) continue;

    const bucket = children.get(edge.source);
    // A duplicated edge must not give a node two slots.
    if (!bucket) children.set(edge.source, [child]);
    else if (!bucket.includes(child)) bucket.push(child);
  }

  for (const [nodeId, bucket] of children) {
    children.set(nodeId, sortSiblings(bucket));
  }

  return children;
};

/**
 * Lays the graph out as a tidy left-to-right tree.
 *
 * Every node sits in the column for its depth and every leaf takes the next
 * free row, so the canvas reads as aligned columns and evenly pitched rows;
 * a parent is then centred between its first and last child. The trigger is
 * normalised back to the origin, so a graph's coordinates do not drift each
 * time a node is added.
 *
 * This replaces an incremental placer that positioned only nodes sitting at
 * (0,0) and left everything else alone. It produced three separate kinds of
 * misalignment:
 *
 * 1. Pass/Fail branches were created at hard-coded *absolute* coordinates, so
 *    they were treated as manually placed and never moved to their parent —
 *    every criteria's branches landed on the same two spots on the canvas.
 * 2. Depth was read back as `x / (NODE_WIDTH + HORIZONTAL_SPACING)` but written
 *    as `depth * HORIZONTAL_SPACING`. The two disagree from the third column
 *    on, where the round-trip collapses a level onto its own parent.
 * 3. Adding a second child re-centred its siblings without moving their
 *    subtrees, detaching branches from the node they belong to.
 *
 * The trade is that adding a node re-tidies the whole tree, so a node the user
 * dragged returns to its computed spot. That is the same trade every canvas
 * with an auto-layout makes, and it is the only way the columns stay true.
 *
 * Iterative with a visited set: a cyclic graph (which the user can create by
 * dragging an edge back to an ancestor) must terminate rather than overflow.
 */
export const getLayoutedElements = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => {
  if (nodes.length === 0) return { nodes, edges };

  const root = nodes.find((node) => node.type === 'trigger');
  if (!root) return { nodes, edges };

  const children = buildChildIndex(nodes, edges);
  const positions = new Map<string, NodePosition>();
  const claimed = new Set<string>([root.id]);
  let nextRow = 0;

  // Post-order walk: a frame is expanded on the way down and positioned on the
  // way back up, once its children have rows to be centred between.
  const stack: Array<{ id: string; depth: number; expanded: boolean }> = [
    { id: root.id, depth: 0, expanded: false },
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (!frame.expanded) {
      frame.expanded = true;

      const kids = children.get(frame.id) ?? [];
      // Pushed in reverse so the first sibling is popped — and so rowed — first.
      for (let index = kids.length - 1; index >= 0; index -= 1) {
        const kid = kids[index];
        if (claimed.has(kid.id)) continue;
        claimed.add(kid.id);
        stack.push({ id: kid.id, depth: frame.depth + 1, expanded: false });
      }
      continue;
    }

    stack.pop();

    // Only children this walk actually placed; an edge back to an ancestor is
    // not a child slot and must not drag the parent out of its subtree.
    const placed = (children.get(frame.id) ?? [])
      .map((child) => positions.get(child.id))
      .filter((position): position is NodePosition => position !== undefined);

    let y: number;
    if (placed.length > 0) {
      y = (placed[0].y + placed[placed.length - 1].y) / 2;
    } else {
      y = nextRow * ROW_STRIDE;
      nextRow += 1;
    }

    positions.set(frame.id, { x: frame.depth * COLUMN_STRIDE, y });
  }

  // Anything the trigger cannot reach is a disconnected node, which
  // `validateGraph` reports. Stack it under the first column so it is visible
  // and cannot overlap the tree.
  for (const node of nodes) {
    if (positions.has(node.id)) continue;
    positions.set(node.id, { x: 0, y: nextRow * ROW_STRIDE });
    nextRow += 1;
  }

  // Keep the trigger at the origin so coordinates stay stable across saves.
  const originY = positions.get(root.id)?.y ?? 0;

  return {
    nodes: nodes.map((node) => {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      return { ...node, position: { x: position.x, y: position.y - originY } };
    }),
    edges,
  };
};

/** Position for a node created without a parent (rare; keeps it off the root). */
export const getInitialNodePosition = (existingNodes: WorkflowNode[]): NodePosition => {
  if (existingNodes.length === 0) return { x: 0, y: 0 };
  const maxX = Math.max(...existingNodes.map((node) => node.position.x));
  return { x: maxX + COLUMN_STRIDE, y: 0 };
};
