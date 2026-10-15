import { useMemo } from 'react';
import { useCachedQuery } from './internal/useCachedQuery';
import { usePagedList } from './internal/usePagedList';
import { queryKeys } from '../constants/query-keys';
import { APPROVAL_DASHBOARD_COLUMNS } from '../constants/columns';
import { APPROVAL_REQUIRED_SELECT_FIELDS } from '../constants/fields';
import { buildApprovalFilter } from '../utils/filters';
import {
  useApprovalWorkflowConfig,
  useApprovalWorkflowServices,
} from '../providers/useApprovalWorkflowConfig';
import type {
  ApprovalDashboardFilters,
  ApprovalHistoryEntry,
  ApprovalRequest,
} from '../types/approval';

const EMPTY_HISTORY: ApprovalHistoryEntry[] = [];

export interface UseApprovalRequestsOptions {
  /**
   * Extra filters merged with the defaults. Defaults show the signed-in user's
   * pending requests, i.e. "my approvals".
   */
  filters?: ApprovalDashboardFilters;
  /** Set false to list every approver's requests (an admin view). @default true */
  scopeToCurrentUser?: boolean;
  /** Set false to include already-decided requests. @default true */
  pendingOnly?: boolean;
  resource?: string;
}

/** Pending approvals assigned to the current user, with paging and search. */
export const useApprovalRequests = (options: UseApprovalRequestsOptions = {}) => {
  const {
    filters,
    scopeToCurrentUser = true,
    pendingOnly = true,
    resource = 'approval-dashboard',
  } = options;

  const { approval } = useApprovalWorkflowServices();
  const { currentUser } = useApprovalWorkflowConfig();

  const viewFilter = useMemo(
    () =>
      buildApprovalFilter({
        ...(pendingOnly ? { status: 'Pending' as const } : {}),
        ...(scopeToCurrentUser ? { approverId: currentUser.id } : {}),
        ...filters,
      }),
    [pendingOnly, scopeToCurrentUser, currentUser.id, filters],
  );

  return usePagedList<ApprovalRequest>({
    resource,
    columns: APPROVAL_DASHBOARD_COLUMNS,
    requiredFields: APPROVAL_REQUIRED_SELECT_FIELDS,
    viewFilter,
    // The dashboard renders `created_by_user`, not the audit sub-document.
    includeAuditFields: false,
    queryKey: queryKeys.approval.list,
    fetchPage: approval.list,
  });
};

/**
 * One approval request, with its audit trail.
 *
 * The two reads are independent and run in parallel; a failed history read is
 * reported on `historyError` without hiding a request that loaded fine.
 */
export const useApprovalRequest = (id: string | undefined) => {
  const { approval } = useApprovalWorkflowServices();
  const enabled = Boolean(id);

  const request = useCachedQuery<ApprovalRequest>(
    queryKeys.approval.detail(id ?? ''),
    (signal) => approval.getById(id as string, signal),
    { enabled },
  );

  const history = useCachedQuery<ApprovalHistoryEntry[]>(
    queryKeys.approval.history(id ?? ''),
    (signal) => approval.getHistory(id as string, signal),
    { enabled },
  );

  return {
    request: request.data,
    history: history.data ?? EMPTY_HISTORY,
    isLoading: enabled && request.isLoading,
    isHistoryLoading: enabled && history.isLoading,
    error: request.error,
    historyError: history.error,
    refetch: request.refetch,
    refetchHistory: history.refetch,
  };
};
