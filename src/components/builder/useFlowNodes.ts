import { useMemo, useRef } from 'react';
import { toFlowNode } from './flow-types';
import type { FlowNode, NodeCallbacks } from './flow-types';
import type { WorkflowNode } from '../../types/graph';

/**
 * React Flow nodes for the graph, reusing the previous object for every node
 * that did not change.
 *
 * Mapping the whole array afresh gave every node a new `data` object whenever
 * any one node moved, so dragging one node re-rendered all of them. Keyed on
 * the `WorkflowNode` object itself (the graph is immutable, so an untouched
 * node keeps its identity), only the node that actually changed is rebuilt.
 * The cache is dropped when the callbacks change, since they live in `data`.
 */
export const useFlowNodes = (
  nodes: WorkflowNode[],
  callbacks: Partial<NodeCallbacks> | null,
  draggable?: boolean,
): FlowNode[] => {
  const cacheRef = useRef<{ callbacks: Partial<NodeCallbacks> | null; byNode: WeakMap<WorkflowNode, FlowNode> }>({ callbacks, byNode: new WeakMap() });

  return useMemo(() => {
    if (cacheRef.current.callbacks !== callbacks) {
      cacheRef.current = { callbacks, byNode: new WeakMap() };
    }
    const { byNode } = cacheRef.current;
    // One lookup table per graph change; a node's parent type never changes.
    const typeById = new Map(nodes.map((node) => [node.id, node.type]));

    return nodes.map((node) => {
      const cached = byNode.get(node);
      if (cached) return cached;
      const flowNode = toFlowNode(node, callbacks, {
        parentType: node.parentId ? typeById.get(node.parentId) : undefined,
        draggable,
      });
      byNode.set(node, flowNode);
      return flowNode;
    });
  }, [nodes, callbacks, draggable]);
};
