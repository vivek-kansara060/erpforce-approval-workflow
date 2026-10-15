import { queryKeys } from '../constants/query-keys';
import { ApprovalWorkflowError } from '../types/common';
import { canTakeDecision } from '../utils/status';
import type { QueryCache } from '../query/cache';
import type { ListQuery, ListResult } from '../types/common';
import type {
  ApprovalDecision,
  ApprovalHistoryEntry,
  ApprovalRequest,
} from '../types/approval';
import type { ModuleRegistry } from '../types/module';
import type { ApprovalApi } from '../api/approval.api';

export interface SubmitDecisionInput {
  request: ApprovalRequest;
  decision: ApprovalDecision;
  /** Payload produced by the adapter's modal. */
  formData: unknown;
}

export interface RunPreActionInput {
  request: ApprovalRequest;
  formData: unknown;
}

export interface ApprovalService {
  list(query: ListQuery, signal?: AbortSignal): Promise<ListResult<ApprovalRequest>>;
  /** One record's approvals across every approver; see `ApprovalApi.listHistory`. */
  listHistory(query: ListQuery, signal?: AbortSignal): Promise<ListResult<ApprovalRequest>>;
  getById(id: string, signal?: AbortSignal): Promise<ApprovalRequest>;
  getHistory(id: string, signal?: AbortSignal): Promise<ApprovalHistoryEntry[]>;
  submitDecision(input: SubmitDecisionInput): Promise<void>;
  runPreAction(input: RunPreActionInput): Promise<void>;
  /** True when the adapter's modal owns the API call. */
  handlesOwnSubmission(entityType: string): boolean;
}

/**
 * Comment text carried by a decision modal's payload.
 *
 * The default modal hands back a bare string; host modals hand back an object
 * keyed either `comments` or `remarks`. Hoisted to module scope so the shape
 * probing is defined once rather than re-created on every decision.
 */
const readComments = (formData: unknown): string | undefined => {
  if (typeof formData === 'string') return formData;
  if (typeof formData !== 'object' || formData === null) return undefined;

  const payload = formData as { comments?: string; remarks?: string };
  return payload.comments ?? payload.remarks;
};

/**
 * Runtime approval behaviour.
 *
 * Decisions are routed through the module registry: an adapter may take over
 * the call entirely (`submitDecision`), declare that its modal already did the
 * work (`handlesOwnSubmission`), or fall through to the generic endpoint.
 * Either way the list and the affected detail entry are invalidated exactly
 * once, here.
 */
export const createApprovalService = (deps: {
  api: ApprovalApi;
  cache: QueryCache;
  modules: ModuleRegistry;
}): ApprovalService => {
  const { api, cache, modules } = deps;

  const invalidate = (request: ApprovalRequest) => {
    cache.invalidate(queryKeys.approval.all);
    if (request.id !== undefined) {
      cache.invalidate(queryKeys.approval.detail(String(request.id)));
    }
  };

  return {
    list: (query, signal) => api.list(query, signal),
    listHistory: (query, signal) => api.listHistory(query, signal),
    getById: (id, signal) => api.getById(id, signal),
    getHistory: (id, signal) => api.getHistory(id, signal),

    handlesOwnSubmission: (entityType) =>
      Boolean(modules.get(entityType).handlesOwnSubmission),

    async submitDecision({ request, decision, formData }) {
      const adapter = modules.get(request.entity_type);

      // The modal performed the call itself (file uploads, multi-step flows).
      if (adapter.handlesOwnSubmission) {
        invalidate(request);
        return;
      }

      if (!canTakeDecision(request.status)) {
        throw new ApprovalWorkflowError(
          `Request is ${String(request.status)} and can no longer be actioned.`,
          { code: 'invalid-transition' },
        );
      }

      const entityId = String(request.entity_id ?? request.id);

      /**
       * The two writers are independent.
       *
       * `callDecisionApi` left unset keeps the original either/or: an adapter
       * that defines `submitDecision` replaces the package endpoint. Set
       * explicitly, a host can run neither, either, or both — the case this
       * exists for is a custom API that is the sole writer, which previously
       * had no way to say so without also supplying a `submitDecision`.
       */
      const callDecisionApi = adapter.callDecisionApi ?? !adapter.submitDecision;

      // Sequential on purpose: the adapter's side effect has to succeed before
      // the request is marked decided, or a failed hand-off leaves an approved
      // request with nothing behind it.
      if (adapter.submitDecision) {
        await adapter.submitDecision({ request, decision, formData, entityId });
      }

      if (callDecisionApi) {
        await api.act({
          id: entityId,
          status: decision,
          comments: readComments(formData),
        });
      }

      invalidate(request);
    },

    async runPreAction({ request, formData }) {
      const adapter = modules.get(request.entity_type);
      if (!adapter.preAction) {
        throw new ApprovalWorkflowError(
          `No pre-action configured for entity type "${request.entity_type}".`,
          { code: 'missing-pre-action' },
        );
      }

      await adapter.preAction.submit(formData, request);
      invalidate(request);
    },
  };
};
