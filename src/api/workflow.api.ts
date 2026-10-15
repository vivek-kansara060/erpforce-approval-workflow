import { ENDPOINTS } from './endpoints';
import { toWorkflowScope } from '../utils/workflow-payload';
import type { HttpClient } from '../types/http';
import type { ListQuery, ListResult } from '../types/common';
import type { Workflow, WorkflowWritePayload } from '../types/workflow';

/** Raw gateway envelopes, narrowed here so nothing downstream sees `any`. */
interface WorkflowListEnvelope {
  data?: { workflows?: RawWorkflow[] };
  pagination?: { totalCount?: number };
}

interface WorkflowDetailEnvelope {
  data?: { workflow?: RawWorkflow };
}

type RawWorkflow = Partial<Workflow> & { _id?: string };

/**
 * The gateway returns Mongo documents keyed by `_id`; the tables and routes in
 * the ERP expect `id`. Normalising here means exactly one place knows about it.
 */
const normalizeWorkflow = (raw: RawWorkflow): Workflow =>
  ({
    ...raw,
    id: raw.id ?? raw._id,
    graph: raw.graph ?? { nodes: [], edges: [] },
    ...toWorkflowScope(raw),
  }) as Workflow;

export interface WorkflowApi {
  list(query: ListQuery, signal?: AbortSignal): Promise<ListResult<Workflow>>;
  getById(id: string, signal?: AbortSignal): Promise<Workflow>;
  create(payload: WorkflowWritePayload): Promise<Workflow>;
  update(payload: WorkflowWritePayload & { id: string }): Promise<Workflow>;
  remove(id: string): Promise<void>;
}

/**
 * Workflow CRUD.
 *
 * Built as a factory over an injected `HttpClient` so the same functions can be
 * unit-tested against a stub and reused by any host transport.
 */
export const createWorkflowApi = (http: HttpClient): WorkflowApi => ({
  async list(query, signal) {
    const response = await http<WorkflowListEnvelope>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.workflows,
      query: { ...query },
      signal,
    });

    return {
      items: (response?.data?.workflows ?? []).map(normalizeWorkflow),
      totalCount: response?.pagination?.totalCount ?? 0,
    };
  },

  async getById(id, signal) {
    const response = await http<WorkflowDetailEnvelope>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.workflowById(id),
      signal,
    });
    return normalizeWorkflow(response?.data?.workflow ?? {});
  },

  async create(payload) {
    const response = await http<WorkflowDetailEnvelope>({
      service: 'workflowAutomation',
      method: 'POST',
      path: ENDPOINTS.workflows,
      body: payload,
    });
    return normalizeWorkflow(response?.data?.workflow ?? (payload as RawWorkflow));
  },

  async update(payload) {
    const response = await http<WorkflowDetailEnvelope>({
      service: 'workflowAutomation',
      method: 'PUT',
      path: ENDPOINTS.workflowById(payload.id),
      body: payload,
    });
    return normalizeWorkflow(response?.data?.workflow ?? (payload as RawWorkflow));
  },

  async remove(id) {
    await http<unknown>({
      service: 'workflowAutomation',
      method: 'DELETE',
      path: ENDPOINTS.workflowById(id),
    });
  },
});
