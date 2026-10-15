import { describe, expect, it } from 'vitest';
import {
  hasScopeSelection,
  toDuplicateFormValues,
  toWorkflowFormValues,
  toWorkflowPayload,
} from '../workflow-payload';
import { createDefaultWorkflowFormValues } from '../../constants/defaults';
import type { Workflow } from '../../types/workflow';
import type { ResultNodeData, WorkflowGraph } from '../../types/graph';
import type { ApproverStage } from '../../types/approver';

describe('hasScopeSelection', () => {
  it('is false when every scope list is empty', () => {
    expect(hasScopeSelection(createDefaultWorkflowFormValues('hrms'))).toBe(false);
  });

  it('is true when any single scope list has an entry', () => {
    expect(
      hasScopeSelection({ ...createDefaultWorkflowFormValues('hrms'), grade_ids: ['G1'] }),
    ).toBe(true);
  });
});

describe('toWorkflowPayload', () => {
  const values = {
    ...createDefaultWorkflowFormValues('hrms'),
    name: 'Leave approval',
    entity_type: 'leave_requests',
    company_ids: [1],
  };

  it('defaults the module from the hosting context', () => {
    const payload = toWorkflowPayload({ ...values, module: '' }, { module: 'procurement' });
    expect(payload.module).toBe('procurement');
  });

  it('omits id on create and includes it on update', () => {
    expect(toWorkflowPayload(values, { module: 'hrms' })).not.toHaveProperty('id');
    expect(toWorkflowPayload({ ...values, id: 'wf-1' }, { module: 'hrms' })).toMatchObject({
      id: 'wf-1',
    });
  });

  it('defaults the status to published', () => {
    expect(toWorkflowPayload(values, { module: 'hrms' }).status).toBe('published');
    expect(toWorkflowPayload(values, { module: 'hrms', status: 'draft' }).status).toBe('draft');
  });

  it('sends an empty graph rather than null when nothing was built', () => {
    expect(toWorkflowPayload(values, { module: 'hrms' }).graph).toEqual({ nodes: [], edges: [] });
  });
});

describe('toWorkflowFormValues', () => {
  const workflow: Workflow = {
    _id: 'abc',
    id: 'abc',
    series_number: 'WF-1',
    name: 'Leave approval',
    module: 'hrms',
    entity_type: 'leave_requests',
    is_active: true,
    status: 'published',
    graph: { nodes: [], edges: [] },
    company_ids: [1],
    location_ids: [],
    department_ids: [],
    grade_ids: [],
    employment_type_ids: [],
  };

  it('maps an API record onto the form shape', () => {
    const values = toWorkflowFormValues(workflow, 'hrms');

    expect(values).toMatchObject({ id: 'abc', name: 'Leave approval', company_ids: [1] });
    expect(values.description).toBe('');
  });

  it('returns defaults for a missing record', () => {
    expect(toWorkflowFormValues(undefined, 'hrms')).toEqual(
      createDefaultWorkflowFormValues('hrms'),
    );
  });

  it('strips the identity when duplicating, so saving creates a new record', () => {
    const values = toDuplicateFormValues(workflow, 'hrms');

    expect(values.id).toBeNull();
    expect(values.status).toBe('draft');
    expect(values.name).toBe('Leave approval');
  });
});

describe('actions in the create and update payload', () => {
  const stage: ApproverStage = {
    action_type_ref: {
      id: 'act_request_approval',
      value: 'request_approval',
      label: 'Request Approval',
    },
    config: {
      approver_type: 'DEPARTMENT',
      department_id: 4,
      designation_id: 9,
      approval_message: 'Approve please',
      auto_approve_enabled: true,
      auto_approve_value: 2,
      auto_approve_unit: 'Day',
    },
    module: 'hrms',
  };

  const graph: WorkflowGraph = {
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Leave', trigger: 'leave_requests', event_type: 'onCreate' },
      },
      {
        id: 'criteria-1',
        type: 'criteria',
        position: { x: 250, y: 0 },
        data: { label: 'Long leave', conditions: [] },
      },
      {
        id: 'pass-1',
        type: 'criteriaResult',
        position: { x: 500, y: -150 },
        parentId: 'criteria-1',
        data: { label: 'Approval', resultType: 'pass', action: [stage] },
      },
      {
        id: 'fail-1',
        type: 'criteriaResult',
        position: { x: 500, y: 150 },
        parentId: 'criteria-1',
        data: { label: 'Fail', resultType: 'fail' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'criteria-1' },
      { id: 'e2', source: 'criteria-1', target: 'pass-1', sourceHandle: 'pass' },
      { id: 'e3', source: 'criteria-1', target: 'fail-1', sourceHandle: 'fail' },
    ],
  };

  const base = {
    ...createDefaultWorkflowFormValues('hrms'),
    name: 'Leave approval',
    entity_type: 'leave_requests',
    company_ids: [1],
    graph,
  };

  const branchIn = (payload: ReturnType<typeof toWorkflowPayload>, id: string) =>
    payload.graph.nodes.find((node) => node.id === id)?.data as ResultNodeData;

  it('carries the action key and config on create', () => {
    const payload = toWorkflowPayload(base, { module: 'hrms' });
    const configured = branchIn(payload, 'pass-1');

    expect(configured.action).toEqual([stage]);
  });

  it('carries them on update too', () => {
    const payload = toWorkflowPayload({ ...base, id: 'wf-1' }, { module: 'hrms' });

    expect(branchIn(payload, 'pass-1').action).toEqual([stage]);
    expect(payload.id).toBe('wf-1');
  });

  it('sends an empty list for a branch the author never configured', () => {
    expect(branchIn(toWorkflowPayload(base, { module: 'hrms' }), 'fail-1').action).toEqual([]);
  });

  it('survives a load-then-save cycle with no edits', () => {
    const saved = toWorkflowPayload(base, { module: 'hrms' });
    const reloaded = toWorkflowFormValues(
      { ...saved, id: 'wf-1' } as unknown as Workflow,
      'hrms',
    );
    const resaved = toWorkflowPayload(reloaded, { module: 'hrms' });

    expect(branchIn(resaved, 'pass-1').action).toEqual([stage]);
  });
});
