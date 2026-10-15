import { describe, expect, it } from 'vitest';
import {
  addActionNode,
  addCriteriaNode,
  createTriggerNode,
  deleteNodeWithChildren,
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
