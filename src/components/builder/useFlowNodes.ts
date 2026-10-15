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
  callbacks: NodeCallbacks | null,
): FlowNode[] => {
  const cacheRef = useRef({ callbacks, byNode: new WeakMap<WorkflowNode, FlowNode>() });

  return useMemo(() => {
    if (cacheRef.current.callbacks !== callbacks) {
      cacheRef.current = { callbacks, byNode: new WeakMap() };
    }
    const { byNode } = cacheRef.current;

    return nodes.map((node) => {
      const cached = byNode.get(node);
      if (cached) return cached;
      const flowNode = toFlowNode(node, callbacks);
      byNode.set(node, flowNode);
      return flowNode;
    });
  }, [nodes, callbacks]);
};
