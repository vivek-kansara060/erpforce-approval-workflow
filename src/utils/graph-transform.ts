import { LAYOUT, DEFAULT_EDGE_STYLE, FLOW_COLORS } from '../constants/defaults';
import type {
  ActionNodeData,
  CriteriaNodeData,
  GraphValidationResult,
  ResultNodeData,
  TriggerNodeData,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeData,
} from '../types/graph';
import type { CriteriaCondition } from '../types/criteria';

const EMPTY_GRAPH: WorkflowGraph = { nodes: [], edges: [] };

/** Per-node-type projection applied before the graph is persisted. */
const transformNodeData = (node: WorkflowNode): WorkflowNodeData => {
  switch (node.type) {
    case 'trigger': {
      const data = node.data as TriggerNodeData;
      return {
        label: data.label || 'Trigger',
        trigger: data.trigger || '',
        triggerId: data.triggerId,
        description: data.description,
        event_type: data.event_type || '',
        module: data.module,
      };
    }
    case 'criteria': {
      const data = node.data as CriteriaNodeData;
      return {
        label: data.label || 'Criteria',
        conditions: data.conditions ?? [],
        logicOperator: data.logicOperator ?? 'AND',
      };
    }
    case 'pass':
    case 'fail':
    case 'criteriaResult':
    case 'actionResult': {
      const data = node.data as ResultNodeData;
      const resultType =
        data.resultType ?? data.type ?? (node.type === 'fail' ? 'fail' : 'pass');
      return {
        label: data.label || (resultType === 'pass' ? 'Pass' : 'Fail'),
        resultType,
        type: resultType,
        /**
         * A branch carries its own approval stages.
         *
         * Clicking a Pass/Fail node opens the *action* sidebar, which writes
         * `action` onto that node — so leaving it out of this projection
         * silently dropped every action key and approver config configured on a
         * branch, on create and on update alike. Re-saving an untouched
         * workflow erased what was already stored.
         */
        action: data.action ?? [],
      };
    }
    case 'action': {
      const data = node.data as ActionNodeData;
      return { label: data.label || 'Action', action: data.action ?? [] };
    }
    default:
      return node.data;
  }
};

/**
 * While editing, a criteria field is the dotted path `entity.field` so the
 * picker can show which entity it came from. The API stores the bare field
 * name and the entity separately in `sub_module`.
 */
export const denormalizeConditionFields = (
  conditions: CriteriaCondition[] | undefined,
): CriteriaCondition[] =>
  (conditions ?? []).map((condition) => ({
    ...condition,
    field: condition.field?.includes('.')
      ? condition.field.split('.').slice(1).join('.')
      : condition.field,
  }));

/**
 * The editor's `entity.field` path for a condition. Persisted conditions carry
 * the bare field with the entity in `sub_module`; an already-dotted field (a
 * graph that never round-tripped through the API) is returned as-is.
 */
export const toDottedField = (
  condition: Pick<CriteriaCondition, 'field' | 'sub_module'>,
): string =>
  condition.field?.includes('.')
    ? condition.field
    : `${condition.sub_module ?? ''}.${condition.field ?? ''}`;

/** Inverse of {@link denormalizeConditionFields}, applied when a graph loads. */
export const normalizeConditionFields = (
  conditions: CriteriaCondition[] | undefined,
): CriteriaCondition[] =>
  (conditions ?? []).map((condition) => ({ ...condition, field: toDottedField(condition) }));

/** Prepares the builder graph for persistence. */
export const transformGraphForApi = (graph: WorkflowGraph | null | undefined): WorkflowGraph => {
  if (!graph?.nodes || !graph?.edges) return EMPTY_GRAPH;

  const nodes: WorkflowNode[] = graph.nodes.map((node) => {
    const data = transformNodeData(node);
    return {
      id: node.id,
      type: node.type,
      position: node.position ?? { x: 0, y: 0 },
      parentId: node.parentId ?? null,
      data:
        node.type === 'criteria'
          ? {
              ...(data as CriteriaNodeData),
              conditions: denormalizeConditionFields((data as CriteriaNodeData).conditions),
            }
          : data,
      measured: node.measured ?? { ...LAYOUT.DEFAULT_MEASURED },
      selected: node.selected ?? false,
      dragging: node.dragging ?? false,
    };
  });

  const edges: WorkflowEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    type: edge.type ?? 'smoothstep',
    style: edge.style ?? { ...DEFAULT_EDGE_STYLE },
    markerEnd: edge.markerEnd ?? { color: FLOW_COLORS.edge, width: 20, height: 20 },
  }));

  return { nodes, edges, ...(graph.viewport ? { viewport: graph.viewport } : {}) };
};

/** Prepares a persisted graph for the builder. */
export const transformGraphFromApi = (graph: WorkflowGraph | null | undefined): WorkflowGraph => {
  if (!graph?.nodes || !graph?.edges) return EMPTY_GRAPH;

  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: node.position ?? { x: 0, y: 0 },
      measured: node.measured ?? { ...LAYOUT.DEFAULT_MEASURED },
      data:
        node.type === 'criteria'
          ? {
              ...(node.data as CriteriaNodeData),
              conditions: normalizeConditionFields((node.data as CriteriaNodeData)?.conditions),
            }
          : ((node.data ?? {}) as WorkflowNodeData),
    })),
    edges: graph.edges.map((edge) => ({ ...edge, type: edge.type ?? 'smoothstep' })),
    ...(graph.viewport ? { viewport: graph.viewport } : {}),
  };
};

/**
 * Structural validation run before submit.
 *
 * Messages are plain English; the views translate the `errors` array through
 * `config.translate` when a matching key exists.
 */
export const validateGraph = (graph: WorkflowGraph | null | undefined): GraphValidationResult => {
  const errors: string[] = [];

  if (!graph) return { isValid: false, errors: ['Graph is missing'] };
  if (!graph.nodes?.length) return { isValid: false, errors: ['Graph must have at least one node'] };

  if (!graph.nodes.some((node) => node.type === 'trigger')) {
    errors.push('Graph must have a trigger node');
  }

  const targets = new Set(graph.edges.map((edge) => edge.target));
  const orphans = graph.nodes.filter((node) => node.type !== 'trigger' && !targets.has(node.id));
  if (orphans.length > 0) {
    errors.push(`Found ${orphans.length} disconnected node(s)`);
  }

  for (const criteria of graph.nodes.filter((node) => node.type === 'criteria')) {
    const childEdges = graph.edges.filter((edge) => edge.source === criteria.id);
    const hasPass = childEdges.some((edge) => edge.sourceHandle === 'pass');
    const hasFail = childEdges.some((edge) => edge.sourceHandle === 'fail');
    if (!hasPass || !hasFail) {
      errors.push(
        `Criteria node "${(criteria.data as CriteriaNodeData).label}" is missing pass/fail branches`,
      );
    }
  }

  return { isValid: errors.length === 0, errors };
};

/** Counts used by the workflow summary card. */
export const summarizeGraph = (graph: WorkflowGraph | null | undefined) => {
  const nodes = graph?.nodes ?? [];
  const countOf = (types: readonly string[]) =>
    nodes.filter((node) => types.includes(node.type)).length;

  return {
    triggers: countOf(['trigger']),
    criteria: countOf(['criteria']),
    actions: countOf(['action', 'criteriaResult', 'actionResult', 'pass', 'fail']),
    total: nodes.length,
  };
};
