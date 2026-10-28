import { queryKeys } from '../constants/query-keys';
import { ApprovalWorkflowError } from '../types/common';
import { hasScopeSelection, toWorkflowPayload } from '../utils/workflow-payload';
import { validateGraph } from '../utils/graph-transform';
import type { QueryCache } from '../query/cache';
import type { ListQuery, ListResult } from '../types/common';
import type {
  SimulationResult,
  Workflow,
  WorkflowFormValues,
  WorkflowHistoryEntry,
} from '../types/workflow';
import type { SimulateWorkflowInput, WorkflowApi } from '../api/workflow.api';

export interface WorkflowValidationResult {
  isValid: boolean;
  /** Machine-readable reasons, so the view can pick its own copy. */
  errors: Array<{ code: 'scope-required' | 'graph-invalid'; message: string }>;
}

export interface SaveWorkflowInput {
  values: WorkflowFormValues;
  mode: 'create' | 'update';
  status?: 'draft' | 'published';
  /** Drafts skip graph validation so a partial flow can be parked. */
  skipGraphValidation?: boolean;
}

export interface WorkflowService {
  list(query: ListQuery, signal?: AbortSignal): Promise<ListResult<Workflow>>;
  getById(id: string, signal?: AbortSignal): Promise<Workflow>;
  validate(input: SaveWorkflowInput): WorkflowValidationResult;
  save(input: SaveWorkflowInput): Promise<Workflow>;
  remove(id: string): Promise<void>;
  toggle(id: string): Promise<boolean>;
  simulate(input: SimulateWorkflowInput): Promise<SimulationResult>;
  history(id: string, signal?: AbortSignal): Promise<WorkflowHistoryEntry[]>;
}

/**
 * Business rules for workflow definitions.
 *
 * Sits between the API layer and the hooks so the rules — scope is mandatory,
 * a published workflow needs a valid graph, saving invalidates the list — live
 * in one testable place instead of being duplicated across the add and edit
 * screens as they were originally.
 */
export const createWorkflowService = (deps: {
  api: WorkflowApi;
  cache: QueryCache;
  module: string;
}): WorkflowService => {
  const { api, cache, module } = deps;

  const validate = ({
    values,
    status,
    skipGraphValidation,
  }: SaveWorkflowInput): WorkflowValidationResult => {
    const errors: WorkflowValidationResult['errors'] = [];

    if (!hasScopeSelection(values)) {
      errors.push({
        code: 'scope-required',
        message:
          'Select at least one company, location, department, grade or employment type.',
      });
    }

    const isDraft = status === 'draft';
    if (!isDraft && !skipGraphValidation) {
      const graphResult = validateGraph(values.graph);
      if (!graphResult.isValid) {
        errors.push({ code: 'graph-invalid', message: graphResult.errors.join(', ') });
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  return {
    list: (query, signal) => api.list(query, signal),

    getById: (id, signal) => api.getById(id, signal),

    validate,

    async save(input) {
      const result = validate(input);
      if (!result.isValid) {
        throw new ApprovalWorkflowError(result.errors.map((error) => error.message).join(' '), {
          code: result.errors[0]?.code,
          details: result.errors,
        });
      }

      const payload = toWorkflowPayload(input.values, { module, status: input.status });

      const saved =
        input.mode === 'update'
          ? await api.update({ ...payload, id: String(input.values.id) })
          : await api.create(payload);

      cache.invalidate(queryKeys.workflow.all);
      return saved;
    },

    async remove(id) {
      await api.remove(id);
      cache.invalidate(queryKeys.workflow.all);
    },

    history: (id, signal) => api.history(id, signal),

    // Read-only on the server, so the cache is left alone.
    simulate: (input) => api.simulate(input),

    async toggle(id) {
      const isActive = await api.toggle(id);
      cache.invalidate(queryKeys.workflow.all);
      return isActive;
    },
  };
};
