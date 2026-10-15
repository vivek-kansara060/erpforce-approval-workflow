import { ENDPOINTS } from './endpoints';
import type { HttpClient } from '../types/http';
import type { ListQuery, ListResult } from '../types/common';
import type {
  ApprovalActionPayload,
  ApprovalHistoryEntry,
  ApprovalRequest,
} from '../types/approval';

/**
 * The approvals service has been seen returning three envelope shapes across
 * environments. Accepting all three here keeps the hooks simple and matches
 * what the original hand-rolled `fetch` calls tolerated.
 */
interface ApprovalListEnvelope {
  data?:
    | { approval_requests?: ApprovalRequest[]; approvals?: ApprovalRequest[]; count?: number }
    | ApprovalRequest[];
  approvals?: ApprovalRequest[];
  pagination?: { totalCount?: number };
  count?: number;
}

const readList = (envelope: ApprovalListEnvelope): ApprovalRequest[] => {
  if (Array.isArray(envelope?.data)) return envelope.data;
  if (Array.isArray(envelope?.data?.approval_requests)) return envelope.data.approval_requests;
  if (Array.isArray(envelope?.data?.approvals)) return envelope.data.approvals;
  if (Array.isArray(envelope?.approvals)) return envelope.approvals;
  return [];
};

const readTotal = (envelope: ApprovalListEnvelope, fallback: number): number => {
  if (typeof envelope?.pagination?.totalCount === 'number') return envelope.pagination.totalCount;
  if (!Array.isArray(envelope?.data) && typeof envelope?.data?.count === 'number') {
    return envelope.data.count;
  }
  if (typeof envelope?.count === 'number') return envelope.count;
  return fallback;
};

export interface ApprovalApi {
  list(query: ListQuery, signal?: AbortSignal): Promise<ListResult<ApprovalRequest>>;
  /**
   * Every approval request raised for one record, whoever it was assigned to.
   * `list` cannot do this: the service scopes it to the caller's own requests.
   * `query.filters` must name the record, e.g.
   * `(entity_type.eq=purchase_orders&entity_id.eq=42)`.
   */
  listHistory(query: ListQuery, signal?: AbortSignal): Promise<ListResult<ApprovalRequest>>;
  getById(id: string, signal?: AbortSignal): Promise<ApprovalRequest>;
  getHistory(id: string, signal?: AbortSignal): Promise<ApprovalHistoryEntry[]>;
  /** Generic approve/reject used when a module adapter has no custom handler. */
  act(payload: ApprovalActionPayload): Promise<unknown>;
}

export const createApprovalApi = (http: HttpClient): ApprovalApi => ({
  async list(query, signal) {
    const envelope = await http<ApprovalListEnvelope>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.approvals,
      query: { ...query },
      signal,
    });

    const items = readList(envelope);
    return { items, totalCount: readTotal(envelope, items.length) };
  },

  async listHistory(query, signal) {
    const envelope = await http<ApprovalListEnvelope>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.approvalHistory(),
      query: { ...query },
      signal,
    });

    const items = readList(envelope);
    return { items, totalCount: readTotal(envelope, items.length) };
  },

  async getById(id, signal) {
    const envelope = await http<{ data?: ApprovalRequest } & Partial<ApprovalRequest>>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.approvalById(id),
      signal,
    });
    return (envelope?.data ?? envelope) as ApprovalRequest;
  },

  async getHistory(id, signal) {
    const envelope = await http<{
      data?: { history?: ApprovalHistoryEntry[] } | ApprovalHistoryEntry[];
    }>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.approvalDetails(id),
      signal,
    });

    if (Array.isArray(envelope?.data)) return envelope.data;
    return envelope?.data?.history ?? [];
  },

  act(payload) {
    const { id, ...body } = payload;
    return http<unknown>({
      service: 'workflowAutomation',
      method: 'PATCH',
      path: ENDPOINTS.approvalById(String(id)),
      body,
    });
  },
});
