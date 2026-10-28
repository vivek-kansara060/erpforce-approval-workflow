import { describe, expect, it, vi } from 'vitest';
import { createWorkflowService } from '../workflow.service';
import { createQueryCache } from '../../query/cache';
import { createDefaultWorkflowFormValues } from '../../constants/defaults';
import { createWorkflowApi } from '../../api/workflow.api';
import type { WorkflowApi } from '../../api/workflow.api';
import type { HttpClient } from '../../types/http';
import type { ResultNodeData, WorkflowGraph } from '../../types/graph';
import type { ApproverStage } from '../../types/approver';
import type { WorkflowFormValues } from '../../types/workflow';

const makeApi = (): WorkflowApi => ({
  list: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getById: vi.fn(),
  create: vi.fn().mockImplementation(async (payload) => payload),
  update: vi.fn().mockImplementation(async (payload) => payload),
  remove: vi.fn().mockResolvedValue(undefined),
  toggle: vi.fn().mockResolvedValue(false),
  history: vi.fn().mockResolvedValue([]),
  simulate: vi.fn().mockResolvedValue({ trigger: null, steps: [], outcome: 'no-trigger' }),
});

const validValues = (overrides: Partial<WorkflowFormValues> = {}): WorkflowFormValues => ({
  ...createDefaultWorkflowFormValues('hrms'),
  name: 'Leave approval',
  entity_type: 'leave_requests',
  company_ids: [1],
  graph: {
    nodes: [
      {
        id: 't1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Leave', trigger: 'leave_requests' },
      },
    ],
    edges: [],
  },
  ...overrides,
});

const makeService = (api = makeApi(), cache = createQueryCache()) => ({
  api,
  cache,
  service: createWorkflowService({ api, cache, module: 'hrms' }),
});

describe('validate', () => {
  it('requires at least one scope selection', () => {
    const { service } = makeService();

    const result = service.validate({
      values: validValues({ company_ids: [] }),
      mode: 'create',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('scope-required');
  });

  it('requires a valid graph when publishing', () => {
    const { service } = makeService();

    const result = service.validate({
      values: validValues({ graph: { nodes: [], edges: [] } }),
      mode: 'create',
      status: 'published',
    });

    expect(result.errors.some((error) => error.code === 'graph-invalid')).toBe(true);
  });

  it('does not require a graph for a draft', () => {
    const { service } = makeService();

    const result = service.validate({
      values: validValues({ graph: { nodes: [], edges: [] } }),
      mode: 'create',
      status: 'draft',
    });

    expect(result.isValid).toBe(true);
  });

  it('accepts a complete workflow', () => {
    const { service } = makeService();
    expect(service.validate({ values: validValues(), mode: 'create' }).isValid).toBe(true);
  });
});

describe('save', () => {
  it('creates when no id is present', async () => {
    const { api, service } = makeService();

    await service.save({ values: validValues(), mode: 'create', status: 'published' });

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('updates when the mode is update and an id exists', async () => {
    const { api, service } = makeService();

    await service.save({
      values: validValues({ id: 'wf-1' }),
      mode: 'update',
      status: 'published',
    });

    expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'wf-1' }));
  });

  it('sends the graph with bare criteria fields', async () => {
    const { api, service } = makeService();

    await service.save({
      values: validValues({
        graph: {
          nodes: [
            {
              id: 't1',
              type: 'trigger',
              position: { x: 0, y: 0 },
              data: { label: 'Leave', trigger: 'leave_requests' },
            },
            {
              id: 'c1',
              type: 'criteria',
              position: { x: 250, y: 0 },
              parentId: 't1',
              data: {
                label: 'Long',
                conditions: [
                  {
                    condition_type: 'operator',
                    field: 'leave_requests.total_days',
                    sub_module: 'leave_requests',
                    operator: 'op_gt',
                    value: 5,
                  },
                ],
              },
            },
            {
              id: 'p1',
              type: 'criteriaResult',
              position: { x: 500, y: -250 },
              parentId: 'c1',
              data: { label: 'Pass', resultType: 'pass' },
            },
            {
              id: 'f1',
              type: 'criteriaResult',
              position: { x: 500, y: 250 },
              parentId: 'c1',
              data: { label: 'Fail', resultType: 'fail' },
            },
          ],
          edges: [
            { id: 'e1', source: 't1', target: 'c1' },
            { id: 'e2', source: 'c1', target: 'p1', sourceHandle: 'pass' },
            { id: 'e3', source: 'c1', target: 'f1', sourceHandle: 'fail' },
          ],
        },
      }),
      mode: 'create',
      status: 'published',
    });

    const payload = (api.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const criteria = payload.graph.nodes.find(
      (node: { type: string }) => node.type === 'criteria',
    );

    expect(criteria.data.conditions[0].field).toBe('total_days');
  });

  it('rejects before calling the API when validation fails', async () => {
    const { api, service } = makeService();

    await expect(
      service.save({ values: validValues({ company_ids: [] }), mode: 'create' }),
    ).rejects.toThrow(/at least one company/);

    expect(api.create).not.toHaveBeenCalled();
  });

  it('invalidates the workflow cache after a successful save', async () => {
    const cache = createQueryCache();
    const invalidate = vi.spyOn(cache, 'invalidate');
    const { service } = makeService(makeApi(), cache);

    await service.save({ values: validValues(), mode: 'create', status: 'published' });

    expect(invalidate).toHaveBeenCalledWith(['workflow']);
  });
});

describe('remove', () => {
  it('deletes and invalidates', async () => {
    const cache = createQueryCache();
    const invalidate = vi.spyOn(cache, 'invalidate');
    const { api, service } = makeService(makeApi(), cache);

    await service.remove('wf-1');

    expect(api.remove).toHaveBeenCalledWith('wf-1');
    expect(invalidate).toHaveBeenCalledWith(['workflow']);
  });
});

describe('toggle', () => {
  it('flips the workflow, returns its new state and invalidates the list', async () => {
    const cache = createQueryCache();
    const invalidate = vi.spyOn(cache, 'invalidate');
    const { api, service } = makeService(makeApi(), cache);

    await expect(service.toggle('wf-1')).resolves.toBe(false);

    expect(api.toggle).toHaveBeenCalledWith('wf-1');
    expect(invalidate).toHaveBeenCalledWith(['workflow']);
  });
});

describe('actions reach the network request', () => {
  /**
   * End-to-end over the real API layer and a stub transport: what the gateway
   * would actually receive for a workflow whose Pass branch carries actions.
   */
  const stage: ApproverStage = {
    action_type_ref: {
      id: 'act_request_approval',
      value: 'request_approval',
      label: 'Request Approval',
    },
    config: {
      approver_type: 'HIERARCHY',
      level: 'L2',
      approval_message: 'Approve',
      auto_approve_enabled: false,
      auto_approve_value: 0,
      auto_approve_unit: '',
    },
    module: 'hrms',
  };

  const graph: WorkflowGraph = {
    nodes: [
      {
        id: 't1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Leave', trigger: 'leave_requests' },
      },
      {
        id: 'c1',
        type: 'criteria',
        position: { x: 250, y: 0 },
        data: { label: 'Long leave', conditions: [] },
      },
      {
        id: 'p1',
        type: 'criteriaResult',
        position: { x: 500, y: -150 },
        parentId: 'c1',
        data: { label: 'Approval', resultType: 'pass', action: [stage] },
      },
      {
        id: 'f1',
        type: 'criteriaResult',
        position: { x: 500, y: 150 },
        parentId: 'c1',
        data: { label: 'Fail', resultType: 'fail' },
      },
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'c1' },
      { id: 'e2', source: 'c1', target: 'p1', sourceHandle: 'pass' },
      { id: 'e3', source: 'c1', target: 'f1', sourceHandle: 'fail' },
    ],
  };

  const setup = () => {
    const http = vi.fn().mockResolvedValue({ data: { workflow: { _id: 'wf-1' } } });
    const cache = createQueryCache();
    const service = createWorkflowService({
      api: createWorkflowApi(http as unknown as HttpClient),
      cache,
      module: 'hrms',
    });
    return { http, service };
  };

  const sentBranch = (http: ReturnType<typeof vi.fn>) => {
    const request = http.mock.calls[0][0] as { body: { graph: WorkflowGraph } };
    return request.body.graph.nodes.find((node) => node.id === 'p1')?.data as ResultNodeData;
  };

  it('sends the action key and config on create', async () => {
    const { http, service } = setup();

    await service.save({ values: validValues({ graph }), mode: 'create' });

    expect(http).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/v1/workflows' }),
    );

    const branch = sentBranch(http);
    expect(branch.action).toHaveLength(1);
    expect(branch.action?.[0].action_type_ref).toMatchObject({
      id: 'act_request_approval',
      value: 'request_approval',
    });
    expect(branch.action?.[0].config).toMatchObject({ approver_type: 'HIERARCHY', level: 'L2' });
  });

  it('sends them on update', async () => {
    const { http, service } = setup();

    await service.save({ values: validValues({ graph, id: 'wf-1' }), mode: 'update' });

    expect(http).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT' }));
    expect(sentBranch(http).action).toEqual([stage]);
  });

  it('sends an empty list for an unconfigured branch rather than omitting the field', async () => {
    const { http, service } = setup();

    await service.save({ values: validValues({ graph }), mode: 'create' });

    const request = http.mock.calls[0][0] as { body: { graph: WorkflowGraph } };
    const fail = request.body.graph.nodes.find((node) => node.id === 'f1')?.data as ResultNodeData;

    expect(fail.action).toEqual([]);
  });
});
