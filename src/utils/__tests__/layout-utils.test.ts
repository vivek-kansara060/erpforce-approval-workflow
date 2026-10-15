import { describe, expect, it } from 'vitest';
import { getLayoutedElements } from '../layout-utils';
import { addCriteriaNode, createTriggerNode } from '../node-utils';
import { LAYOUT } from '../../constants/defaults';
import type { ResultNodeData, WorkflowEdge, WorkflowNode } from '../../types/graph';

const COLUMN_STRIDE = LAYOUT.NODE_WIDTH + LAYOUT.HORIZONTAL_SPACING;
const ROW_STRIDE = LAYOUT.NODE_HEIGHT + LAYOUT.VERTICAL_SPACING;

const trigger = (): WorkflowNode =>
  createTriggerNode({ label: 'Leave', entityType: 'leave_requests', module: 'hrms' });

const byId = (nodes: WorkflowNode[], id: string) =>
  nodes.find((node) => node.id === id) as WorkflowNode;

const branchOf = (nodes: WorkflowNode[], parentId: string, resultType: 'pass' | 'fail') =>
  nodes.find(
    (node) =>
      node.parentId === parentId && (node.data as ResultNodeData).resultType === resultType,
  ) as WorkflowNode;

/** trigger -> criteria -> { pass, fail } */
const oneCriteria = () => {
  const root = trigger();
  const result = addCriteriaNode(root.id, [root], [], { label: 'Long leave', conditions: [] });
  const criteria = result.nodes.find((node) => node.type === 'criteria') as WorkflowNode;
  return { ...result, root, criteria };
};

describe('getLayoutedElements', () => {
  it('keeps the trigger at the origin', () => {
    const { nodes, root } = oneCriteria();
    expect(byId(nodes, root.id).position).toEqual({ x: 0, y: 0 });
  });

  it('gives each depth its own column', () => {
    const { nodes, root, criteria } = oneCriteria();

    expect(byId(nodes, root.id).position.x).toBe(0);
    expect(byId(nodes, criteria.id).position.x).toBe(COLUMN_STRIDE);
    expect(branchOf(nodes, criteria.id, 'pass').position.x).toBe(COLUMN_STRIDE * 2);
    expect(branchOf(nodes, criteria.id, 'fail').position.x).toBe(COLUMN_STRIDE * 2);
  });

  it('centres a node between its branches, one row apart', () => {
    const { nodes, criteria } = oneCriteria();

    const pass = branchOf(nodes, criteria.id, 'pass').position.y;
    const fail = branchOf(nodes, criteria.id, 'fail').position.y;

    expect(pass).toBeLessThan(fail);
    expect(fail - pass).toBe(ROW_STRIDE);
    expect(byId(nodes, criteria.id).position.y).toBe((pass + fail) / 2);
  });

  it('never leaves a branch in its parent\'s column', () => {
    const { nodes, criteria } = oneCriteria();
    const criteriaX = byId(nodes, criteria.id).position.x;

    expect(branchOf(nodes, criteria.id, 'pass').position.x).toBeGreaterThan(criteriaX);
    expect(branchOf(nodes, criteria.id, 'fail').position.x).toBeGreaterThan(criteriaX);
  });

  it('keeps a branch attached to its parent when a sibling is added later', () => {
    const first = oneCriteria();
    const second = addCriteriaNode(first.root.id, first.nodes, first.edges, {
      label: 'Short leave',
      conditions: [],
    });

    const criteriaNodes = second.nodes.filter((node) => node.type === 'criteria');
    expect(criteriaNodes).toHaveLength(2);

    // Both criteria — the pre-existing one included — stay centred between the
    // branches they own. The incremental placer re-centred siblings without
    // moving their subtrees, which detached the first criteria's branches.
    for (const criteria of criteriaNodes) {
      const pass = branchOf(second.nodes, criteria.id, 'pass').position;
      const fail = branchOf(second.nodes, criteria.id, 'fail').position;

      expect(criteria.position.y).toBe((pass.y + fail.y) / 2);
      expect(fail.y - pass.y).toBe(ROW_STRIDE);
      expect(pass.x).toBe(fail.x);
    }
  });

  it('gives every node in a column a distinct row', () => {
    const first = oneCriteria();
    const second = addCriteriaNode(first.root.id, first.nodes, first.edges, {
      label: 'Short leave',
      conditions: [],
    });

    const byColumn = new Map<number, number[]>();
    for (const node of second.nodes) {
      const column = byColumn.get(node.position.x) ?? [];
      column.push(node.position.y);
      byColumn.set(node.position.x, column);
    }

    for (const rows of byColumn.values()) {
      expect(new Set(rows).size).toBe(rows.length);
    }
  });

  it('does not collapse a column once the chain runs deeper than two levels', () => {
    const root = trigger();
    const chain: WorkflowNode[] = [root];
    const edges: WorkflowEdge[] = [];

    for (let depth = 1; depth <= 4; depth += 1) {
      chain.push({
        id: `n${depth}`,
        type: 'criteria',
        position: { x: 0, y: 0 },
        parentId: depth === 1 ? root.id : `n${depth - 1}`,
        data: { label: `n${depth}`, conditions: [] },
      });
      edges.push({
        id: `e${depth}`,
        source: depth === 1 ? root.id : `n${depth - 1}`,
        target: `n${depth}`,
      });
    }

    const { nodes } = getLayoutedElements(chain, edges);
    const columns = nodes.map((node) => node.position.x);

    expect(columns).toEqual([0, COLUMN_STRIDE, COLUMN_STRIDE * 2, COLUMN_STRIDE * 3, COLUMN_STRIDE * 4]);
  });

  it('terminates on a cycle instead of overflowing the stack', () => {
    const root = trigger();
    const nodes: WorkflowNode[] = [
      root,
      { id: 'a', type: 'criteria', position: { x: 0, y: 0 }, parentId: root.id, data: { label: 'a', conditions: [] } },
      { id: 'b', type: 'criteria', position: { x: 0, y: 0 }, parentId: 'a', data: { label: 'b', conditions: [] } },
    ];
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: root.id, target: 'a' },
      { id: 'e2', source: 'a', target: 'b' },
      { id: 'e3', source: 'b', target: 'a' },
    ];

    const result = getLayoutedElements(nodes, edges);

    expect(result.nodes).toHaveLength(3);
    expect(byId(result.nodes, 'b').position.x).toBe(COLUMN_STRIDE * 2);
  });

  it('places a disconnected node without overlapping the tree', () => {
    const base = oneCriteria();
    const orphan: WorkflowNode = {
      id: 'orphan',
      type: 'criteria',
      position: { x: 0, y: 0 },
      data: { label: 'orphan', conditions: [] },
    };

    const { nodes } = getLayoutedElements([...base.nodes, orphan], base.edges);
    const placed = nodes.map((node) => `${node.position.x}:${node.position.y}`);

    expect(new Set(placed).size).toBe(nodes.length);
  });

  it('returns the graph untouched when it has no trigger', () => {
    const nodes: WorkflowNode[] = [
      { id: 'a', type: 'criteria', position: { x: 11, y: 22 }, data: { label: 'a', conditions: [] } },
    ];

    expect(getLayoutedElements(nodes, []).nodes[0].position).toEqual({ x: 11, y: 22 });
  });
});
