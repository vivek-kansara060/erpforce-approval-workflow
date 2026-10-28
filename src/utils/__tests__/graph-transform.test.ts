import { describe, expect, it } from 'vitest';
import {
  denormalizeConditionFields,
  normalizeConditionFields,
  summarizeGraph,
  transformGraphForApi,
  transformGraphFromApi,
  validateGraph,
} from '../graph-transform';
import { DEFAULT_EDGE_STYLE } from '../../constants/defaults';
import type {
  ActionNodeData,
  ResultNodeData,
  WorkflowGraph,
} from '../../types/graph';
import type { ApproverStage } from '../../types/approver';

const graphWithCriteria = (): WorkflowGraph => ({
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { label: 'Leave Request', trigger: 'leave_requests', event_type: 'onCreate' },
    },
    {
      id: 'criteria-1',
      type: 'criteria',
      position: { x: 250, y: 0 },
      parentId: 'trigger-1',
      data: {
        label: 'Long leave',
        conditions: [
          {
            condition_type: 'operator',
            field: 'leave_requests.total_days',
            sub_module: 'leave_requests',
            operator: 'op_greater_than',
            value: 5,
            logical_operator: 'AND',
          },
        ],
      },
    },
    {
      id: 'pass-1',
      type: 'criteriaResult',
      position: { x: 500, y: -250 },
      parentId: 'criteria-1',
      data: { label: 'Pass', resultType: 'pass' },
    },
    {
      id: 'fail-1',
      type: 'criteriaResult',
      position: { x: 500, y: 250 },
      parentId: 'criteria-1',
      data: { label: 'Fail', resultType: 'fail' },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'criteria-1' },
    { id: 'e2', source: 'criteria-1', target: 'pass-1', sourceHandle: 'pass' },
    { id: 'e3', source: 'criteria-1', target: 'fail-1', sourceHandle: 'fail' },
  ],
});

describe('condition field normalisation', () => {
  it('strips the entity prefix on the way to the API', () => {
    const result = denormalizeConditionFields([
      {
        condition_type: 'operator',
        field: 'leave_requests.total_days',
        sub_module: 'leave_requests',
        operator: 'op_gt',
        value: 5,
      },
    ]);

    expect(result[0].field).toBe('total_days');
  });

  it('restores the entity prefix on the way back', () => {
    const result = normalizeConditionFields([
      {
        condition_type: 'operator',
        field: 'total_days',
        sub_module: 'leave_requests',
        operator: 'op_gt',
        value: 5,
      },
    ]);

    expect(result[0].field).toBe('leave_requests.total_days');
  });

  it('round-trips without corrupting the field', () => {
    const original = [
      {
        condition_type: 'operator' as const,
        field: 'leave_requests.total_days',
        sub_module: 'leave_requests',
        operator: 'op_gt',
        value: 5,
      },
    ];

    expect(normalizeConditionFields(denormalizeConditionFields(original))[0].field).toBe(
      original[0].field,
    );
  });

  it('leaves an already-bare field alone when re-normalising', () => {
    const once = denormalizeConditionFields([
      {
        condition_type: 'operator',
        field: 'total_days',
        sub_module: 'leave_requests',
        operator: 'op_gt',
        value: 1,
      },
    ]);

    expect(once[0].field).toBe('total_days');
  });
});

describe('transformGraphForApi', () => {
  it('emits bare condition fields and default measurements', () => {
    const result = transformGraphForApi(graphWithCriteria());
    const criteria = result.nodes.find((node) => node.type === 'criteria');

    expect((criteria?.data as { conditions: Array<{ field?: string }> }).conditions[0].field).toBe(
      'total_days',
    );
    expect(criteria?.measured).toEqual({ width: 366, height: 55 });
  });

  it('defaults edge type and style', () => {
    const result = transformGraphForApi(graphWithCriteria());
    expect(result.edges.every((edge) => edge.type === 'smoothstep')).toBe(true);
    // Asserted against the constant: the point of the test is that the default
    // is applied, not which hex the theme happens to use this release.
    expect(result.edges[0].style).toEqual({ ...DEFAULT_EDGE_STYLE });
  });

  it('returns an empty graph for null input rather than throwing', () => {
    expect(transformGraphForApi(null)).toEqual({ nodes: [], edges: [] });
  });

  it('preserves the viewport when present', () => {
    const graph = { ...graphWithCriteria(), viewport: { x: 10, y: 20, zoom: 1.5 } };
    expect(transformGraphForApi(graph).viewport).toEqual({ x: 10, y: 20, zoom: 1.5 });
  });
});

describe('transformGraphFromApi', () => {
  it('re-prefixes criteria fields for the editor', () => {
    const persisted = transformGraphForApi(graphWithCriteria());
    const restored = transformGraphFromApi(persisted);
    const criteria = restored.nodes.find((node) => node.type === 'criteria');

    expect((criteria?.data as { conditions: Array<{ field?: string }> }).conditions[0].field).toBe(
      'leave_requests.total_days',
    );
  });
});

describe('validateGraph', () => {
  it('accepts a complete graph', () => {
    expect(validateGraph(graphWithCriteria())).toEqual({ isValid: true, errors: [] });
  });

  it('rejects a graph with no trigger', () => {
    const graph = graphWithCriteria();
    graph.nodes = graph.nodes.filter((node) => node.type !== 'trigger');

    const result = validateGraph(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Graph must have a trigger node');
  });

  it('rejects a criteria node missing its fail branch', () => {
    const graph = graphWithCriteria();
    graph.nodes = graph.nodes.filter((node) => node.id !== 'fail-1');
    graph.edges = graph.edges.filter((edge) => edge.target !== 'fail-1');

    const result = validateGraph(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('pass/fail'))).toBe(true);
  });

  it('reports disconnected nodes', () => {
    const graph = graphWithCriteria();
    graph.nodes.push({
      id: 'orphan',
      type: 'action',
      position: { x: 900, y: 0 },
      data: { label: 'Orphan', action: [] },
    });

    expect(validateGraph(graph).errors).toContain('Found 1 disconnected node(s)');
  });

  it('rejects an empty graph', () => {
    expect(validateGraph({ nodes: [], edges: [] }).isValid).toBe(false);
    expect(validateGraph(null).isValid).toBe(false);
  });
});

describe('summarizeGraph', () => {
  it('does not count the auto-created Pass/Fail branches as actions', () => {
    expect(summarizeGraph(graphWithCriteria())).toEqual({
      triggers: 1,
      criteria: 1,
      actions: 0,
      total: 4,
    });
  });

  it('counts the stages configured on actions and branches', () => {
    const stage = { action_type_ref: null } as ApproverStage;
    const graph = graphWithCriteria();
    graph.nodes[2].data = { label: 'Pass', resultType: 'pass', action: [stage, stage] };
    graph.nodes.push({
      id: 'action-1',
      type: 'action',
      position: { x: 0, y: 0 },
      parentId: 'trigger-1',
      data: { label: 'Direct', action: [stage] },
    });

    expect(summarizeGraph(graph).actions).toBe(3);
  });

  it('counts an action node with no stages yet as one', () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: 'action-1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: { label: 'Direct', action: [] },
        },
      ],
      edges: [],
    };
    expect(summarizeGraph(graph).actions).toBe(1);
  });

  it('handles a missing graph', () => {
    expect(summarizeGraph(undefined).total).toBe(0);
  });
});

describe('actions on a Pass/Fail branch', () => {
  /**
   * Branches are edited through the action sidebar, so a configured branch
   * carries both its `resultType` and the approval stages the author set.
   */
  const stage = (actionValue: string): ApproverStage => ({
    action_type_ref: {
      id: `act_${actionValue}`,
      value: actionValue,
      label: actionValue,
    },
    config: {
      approver_type: 'USER',
      approver_ids: [12],
      approval_message: 'Needs approval',
      auto_approve_enabled: false,
      auto_approve_value: 0,
      auto_approve_unit: '',
    },
    module: 'hrms',
  });

  const branchGraph = (data: Partial<ResultNodeData>): WorkflowGraph => ({
    nodes: [
      {
        id: 'pass-1',
        type: 'criteriaResult',
        position: { x: 0, y: 0 },
        data: { label: 'Approval', resultType: 'pass', ...data } as ResultNodeData,
      },
    ],
    edges: [],
  });

  const branchOf = (graph: WorkflowGraph) =>
    transformGraphForApi(graph).nodes[0].data as ResultNodeData;

  it('keeps the action key and its config in the payload', () => {
    const result = branchOf(branchGraph({ action: [stage('request_approval')] }));

    expect(result.action).toHaveLength(1);
    expect(result.action?.[0].action_type_ref).toEqual({
      id: 'act_request_approval',
      value: 'request_approval',
      label: 'request_approval',
    });
    expect(result.action?.[0].config).toMatchObject({
      approver_type: 'USER',
      approver_ids: [12],
    });
    expect(result.action?.[0].module).toBe('hrms');
  });

  it('keeps every stage of a multi-stage branch, in order', () => {
    const result = branchOf(
      branchGraph({ action: [stage('request_approval'), stage('send_email')] }),
    );

    expect(result.action?.map((entry) => (entry.action_type_ref as { value: string }).value))
      .toEqual(['request_approval', 'send_email']);
  });

  it('still records the branch itself', () => {
    const result = branchOf(branchGraph({ action: [stage('request_approval')] }));

    expect(result).toMatchObject({ label: 'Approval', resultType: 'pass', type: 'pass' });
  });

  it('sends an empty list for a branch with no actions', () => {
    expect(branchOf(branchGraph({}))).toMatchObject({ action: [] });
  });

  it('round-trips unchanged, so re-saving an untouched workflow preserves actions', () => {
    const original = [stage('request_approval'), stage('send_email')];

    const saved = transformGraphForApi(branchGraph({ action: original }));
    const reloaded = transformGraphFromApi(saved);
    const resaved = transformGraphForApi(reloaded);

    // Asserted against the input, not against `saved` — comparing the two
    // outputs passes even when both drop the actions entirely.
    expect((resaved.nodes[0].data as ResultNodeData).action).toEqual(original);
  });

  it('applies to legacy pass/fail node types too', () => {
    const legacy: WorkflowGraph = {
      nodes: [
        {
          id: 'fail-1',
          type: 'fail',
          position: { x: 0, y: 0 },
          data: { label: 'Rejected', resultType: 'fail', action: [stage('send_email')] },
        },
      ],
      edges: [],
    };

    expect((transformGraphForApi(legacy).nodes[0].data as ResultNodeData).action).toHaveLength(1);
  });

  it('leaves a dedicated action node working as before', () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: 'action-1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: { label: 'Notify', action: [stage('send_notification')] },
        },
      ],
      edges: [],
    };

    expect((transformGraphForApi(graph).nodes[0].data as ActionNodeData).action).toHaveLength(1);
  });
});
