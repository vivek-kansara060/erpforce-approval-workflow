import { useMemo } from 'react';
import { useCachedQuery } from './internal/useCachedQuery';
import { queryKeys } from '../constants/query-keys';
import {
  belongsToEntity,
  buildApprovalHistoryQuery,
  toApprovalHistory,
  toEntityRef,
} from '../utils/approval-history';
import { useApprovalWorkflowServices } from '../providers/useApprovalWorkflowConfig';
import type { ApprovalHistoryData, ApprovalRequest } from '../types/approval';
import type { ListResult } from '../types/common';

const EMPTY_RECORDS: ApprovalRequest[] = [];

export interface UseApprovalHistoryOptions {
  /** Entity the record belongs to, e.g. `purchase_orders`. */
  entityType: string | null | undefined;
  /** Primary key of the record in its own module. */
  entityId: string | number | null | undefined;
  /**
   * Set false to hold the request back, e.g. until a popover opens.
   * @default true
   */
  enabled?: boolean;
}

/**
 * One record's approval history: every approval request raised for it, by any
 * approver, in any status, grouped into submission rounds and approval levels.
 *
 * Nothing is requested until both identifiers are present. The raw requests
 * are cached under the `approval` prefix, so a decision taken anywhere in the
 * package refreshes an open history and drops a closed one.
 */
export const useApprovalHistory = ({
  entityType,
  entityId,
  enabled = true,
}: UseApprovalHistoryOptions) => {
  const { approval } = useApprovalWorkflowServices();

  const ref = toEntityRef(entityType, entityId);
  const type = ref?.entityType ?? '';
  const id = ref?.entityId ?? '';

  const result = useCachedQuery<ListResult<ApprovalRequest>>(
    queryKeys.approval.byEntity(type, id),
    (signal) =>
      approval.listHistory(buildApprovalHistoryQuery({ entityType: type, entityId: id }), signal),
    { enabled: enabled && ref !== undefined },
  );

  const items = result.data?.items;
  const records = useMemo(
    () =>
      items
        ? // Never trust the service to have scoped the list: drop anything from another record.
          items.filter((item) => belongsToEntity(item, { entityType: type, entityId: id }))
        : EMPTY_RECORDS,
    [items, type, id],
  );

  const history = useMemo<ApprovalHistoryData>(() => toApprovalHistory(records), [records]);

  return {
    ...history,
    /** The approval requests the history was built from. */
    records,
    /** False when either identifier is missing; nothing is fetched then. */
    hasIdentity: ref !== undefined,
    isLoading: result.isLoading,
    isRefetching: result.isRefetching,
    error: result.error,
    refetch: result.refetch,
  };
};

export type UseApprovalHistoryResult = ReturnType<typeof useApprovalHistory>;
