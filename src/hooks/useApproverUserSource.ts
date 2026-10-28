import { useCallback } from 'react';
import { useApprovalPermissions } from '../permissions/usePermission';
import {
  useApprovalWorkflowApi,
  useApprovalWorkflowContext,
} from '../providers/useApprovalWorkflowConfig';
import { queryKeys, REFERENCE_STALE_TIME } from '../constants/query-keys';
import {
  mergeApproverDirectories,
  pageApproverCandidates,
} from '../utils/approver-directory';
import type { ApproverCandidate, ApproverPageQuery } from '../utils/approver-directory';
import type { WorkflowScope } from '../types/workflow';

/** Lookup props for the User approver selector, forwarded to the ERP `SearchableSelect`. */
export interface ApproverUserSource {
  /** Serves the select from the merged directory; the select drives paging and search. */
  customFetchApi: (query?: ApproverPageQuery & { filters?: Record<string, unknown> }) => Promise<{
    data: ApproverCandidate[];
    pagination: { totalCount: number };
  }>;
}

const EMPTY_COMPANIES: Array<string | number> = [];

/**
 * Serves the User approver from one deduplicated directory.
 *
 * A workflow stores approvers as **user** ids. Which directories are read
 * depends on access:
 *
 * - With `employee` access, the users **and** employees lookups both run and
 *   are merged on the user id (`employee.user_id === user.id`), so each person
 *   appears once, under their HR name, with the account name beside it when
 *   the two differ. See `mergeApproverDirectories`.
 * - Without it, only the users lookup runs, as before.
 *
 * Either way the persisted payload is a list of user ids, so a workflow
 * authored by one role opens correctly for the other.
 *
 * Nothing is fetched until the select asks for options (on open, or to label
 * already-saved ids), so opening the action drawer issues no request. The two
 * calls then run in parallel, and the merged result is cached per company scope
 * so every later open, search and scroll is served from memory.
 */
export const useApproverUserSource = (
  // Only the company scope narrows the directory, so ask for only that.
  scope: Partial<Pick<WorkflowScope, 'company_ids'>>,
): ApproverUserSource => {
  const permissions = useApprovalPermissions();
  const { reference } = useApprovalWorkflowApi();
  const { cache } = useApprovalWorkflowContext();
  const withEmployees = permissions['employee.directory'];
  const companyIds = scope.company_ids ?? EMPTY_COMPANIES;
  const scopeKey = companyIds.join(',');

  const customFetchApi = useCallback<ApproverUserSource['customFetchApi']>(
    async (query = {}) => {
      const candidates = await cache.fetch(
        queryKeys.reference.approverDirectory(scopeKey, withEmployees),
        async (signal) => {
          const [users, employees] = await Promise.all([
            reference.approverUsers(companyIds, signal),
            withEmployees ? reference.approverEmployees(companyIds, signal) : Promise.resolve([]),
          ]);
          return mergeApproverDirectories(users, employees);
        },
        { staleTime: REFERENCE_STALE_TIME },
      );

      // The select resolves saved values with an `&id.in` filter.
      const ids = query.filters?.['&id.in'];
      return pageApproverCandidates(candidates, {
        ...query,
        ids: Array.isArray(ids) ? (ids as Array<number | string>) : undefined,
      });
    },
    // `scopeKey` stands in for `companyIds`, whose identity changes per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache, reference, scopeKey, withEmployees],
  );

  return { customFetchApi };
};
