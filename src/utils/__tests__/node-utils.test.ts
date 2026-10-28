import { describe, expect, it } from 'vitest';
import {
  addActionNode,
  addCriteriaNode,
  createTriggerNode,
  deleteNodeWithChildren,
  duplicateSubtree,
  findDescendantIds,
  updateNodeData,
} from '../node-utils';
import type { WorkflowEdge, WorkflowNode } from '../../types/graph';

const trigger = (): WorkflowNode =>
  createTriggerNode({ label: 'Leave', entityType: 'leave_requests', module: 'hrms' });

describe('addCriteriaNode', () => {
  it('creates the criteria node with a pass and a fail branch', () => {
    const root = trigger();
    const result = addCriteriaNode(root.id, [root], [], { label: 'Long leave', conditions: [] });

    expect(result.nodes).toHaveLength(4);
    expect(result.nodes.filter((node) => node.type === 'criteriaResult')).toHaveLength(2);
    expect(result.edges).toHaveLength(3);
  });

  it('labels the branch edges via sourceHandle', () => {
    const root = trigger();
    const result = addCriteriaNode(root.id, [root], [], { label: 'c', conditions: [] });
    const handles = result.edges.map((edge) => edge.sourceHandle).filter(Boolean);

    expect(handles).toEqual(expect.arrayContaining(['pass', 'fail']));
  });

  it('places pass above fail', () => {
    const root = trigger();
    const result = addCriteriaNode(root.id, [root], [], { label: 'c', conditions: [] });

    const pass = result.nodes.find(
      (node) => node.type === 'criteriaResult' && (node.data as { resultType: string }).resultType === 'pass',
    );
    const fail = result.nodes.find(
      (node) => node.type === 'criteriaResult' && (node.data as { resultType: string }).resultType === 'fail',
    );

    expect(pass?.position.y).toBeLessThan(fail?.position.y as number);
  });

  it('gives every generated node a unique id even within the same tick', () => {
    const root = trigger();
    const result = addCriteriaNode(root.id, [root], [], { label: 'c', conditions: [] });
    const ids = new Set(result.nodes.map((node) => node.id));

    expect(ids.size).toBe(result.nodes.length);
  });
});

describe('addActionNode', () => {
  it('creates the action node with its own pass and fail branches', () => {
    const root = trigger();
    const result = addActionNode(root.id, [root], [], { label: 'Approve', action: [] });

    expect(result.nodes.filter((node) => node.type === 'actionResult')).toHaveLength(2);
    expect(result.nodes.find((node) => node.type === 'action')?.parentId).toBe(root.id);
  });
});

describe('findDescendantIds', () => {
  it('walks the whole subtree', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'b', target: 'd' },
    ];

    expect(findDescendantIds('a', edges).sort()).toEqual(['b', 'c', 'd']);
  });

  it('terminates on a cycle instead of overflowing the stack', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ];

    expect(findDescendantIds('a', edges)).toEqual(['b']);
  });
});

describe('deleteNodeWithChildren', () => {
  it('removes the node, its descendants and every attached edge', () => {
    const root = trigger();
    const withCriteria = addCriteriaNode(root.id, [root], [], { label: 'c', conditions: [] });
    const criteria = withCriteria.nodes.find((node) => node.type === 'criteria');

    const result = deleteNodeWithChildren(
      criteria?.id as string,
      withCriteria.nodes,
      withCriteria.edges,
    );

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe(root.id);
    expect(result.edges).toHaveLength(0);
    expect(result.hadChildren).toBe(true);
    expect(result.removedCount).toBe(3);
  });

  it('reports when a leaf had no children', () => {
    const root = trigger();
    const withCriteria = addCriteriaNode(root.id, [root], [], { label: 'c', conditions: [] });
    const leaf = withCriteria.nodes.find((node) => node.type === 'criteriaResult');

    const result = deleteNodeWithChildren(leaf?.id as string, withCriteria.nodes, withCriteria.edges);
    expect(result.hadChildren).toBe(false);
  });
});

describe('updateNodeData', () => {
  it('merges into the target node only', () => {
    const root = trigger();
    const other = { ...root, id: 'other' };

    const result = updateNodeData(root.id, { label: 'Renamed' }, [root, other]);

    expect(result[0].data.label).toBe('Renamed');
    expect(result[1].data.label).toBe('Leave');
  });

  it('does not mutate the input array', () => {
    const root = trigger();
    const nodes = [root];
    updateNodeData(root.id, { label: 'Renamed' }, nodes);

    expect(nodes[0].data.label).toBe('Leave');
  });
});

describe('duplicateSubtree', () => {
  const build = () => {
    const root = trigger();
    const first = addActionNode(root.id, [root], [], {
      label: 'Manager approval',
      action: [{ action_type_ref: { id: 1, value: 'request_approval', label: 'Request Approval' } }],
    });
    const action = first.nodes.find((node) => node.type === 'action') as WorkflowNode;
    return { root, action, ...first };
  };

  it('copies the block and its Pass/Fail branches as a sibling under the same parent', () => {
    const { root, action, nodes, edges } = build();
    const result = duplicateSubtree(action.id, nodes, edges);

    expect(result).not.toBeNull();
    expect(result?.nodes).toHaveLength(nodes.length + 3);

    const copy = result?.nodes.find((node) => node.id === result.rootId) as WorkflowNode;
    expect(copy.type).toBe('action');
    expect(copy.parentId).toBe(root.id);
    expect(result?.edges.some((edge) => edge.source === root.id && edge.target === copy.id)).toBe(true);
  });

  it('labels only the copied block, so the pair can be told apart', () => {
    const { action, nodes, edges } = build();
    const result = duplicateSubtree(action.id, nodes, edges, ' (copy)');
    const copy = result?.nodes.find((node) => node.id === result.rootId) as WorkflowNode;
    const copiedBranches = result?.nodes.filter((node) => node.parentId === copy.id) ?? [];

    expect((copy.data as { label: string }).label).toBe('Manager approval (copy)');
    expect(copiedBranches.map((node) => (node.data as { label: string }).label).sort()).toEqual([
      'Fail',
      'Pass',
    ]);
  });

  it('wires the copy to its own branches and keeps the pass/fail handles', () => {
    const { action, nodes, edges } = build();
    const result = duplicateSubtree(action.id, nodes, edges);
    const copyId = result?.rootId as string;
    const branchIds = new Set(result?.nodes.filter((node) => node.parentId === copyId).map((n) => n.id));
    const out = result?.edges.filter((edge) => edge.source === copyId) ?? [];

    expect(out).toHaveLength(2);
    expect(out.every((edge) => branchIds.has(edge.target))).toBe(true);
    expect(out.map((edge) => edge.sourceHandle).sort()).toEqual(['fail', 'pass']);
  });

  it('shares nothing with the original: ids are new and data is deep-copied', () => {
    const { action, nodes, edges } = build();
    const result = duplicateSubtree(action.id, nodes, edges);
    const originalIds = new Set(nodes.map((node) => node.id));
    const added = result?.nodes.filter((node) => !originalIds.has(node.id)) ?? [];

    expect(added).toHaveLength(3);
    const copy = result?.nodes.find((node) => node.id === result.rootId) as WorkflowNode;
    expect((copy.data as { action: unknown[] }).action).not.toBe(
      (action.data as { action: unknown[] }).action,
    );
    expect(new Set(result?.nodes.map((node) => node.id)).size).toBe(result?.nodes.length);
  });

  it('leaves the original graph untouched', () => {
    const { action, nodes, edges } = build();
    const before = JSON.stringify({ nodes, edges });
    duplicateSubtree(action.id, nodes, edges);
    expect(JSON.stringify({ nodes, edges })).toBe(before);
  });

  it('refuses the trigger, a Pass/Fail branch and an unknown id', () => {
    const { root, nodes, edges } = build();
    const branch = nodes.find((node) => node.type === 'actionResult') as WorkflowNode;

    expect(duplicateSubtree(root.id, nodes, edges)).toBeNull();
    expect(duplicateSubtree(branch.id, nodes, edges)).toBeNull();
    expect(duplicateSubtree('missing', nodes, edges)).toBeNull();
  });
});
