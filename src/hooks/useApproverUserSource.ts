import { useMemo } from 'react';
import { useApprovalPermissions } from '../permissions/usePermission';
import type { WorkflowScope } from '../types/workflow';

/**
 * Lookup props for the User approver selector, forwarded to the ERP
 * `SearchableSelect`.
 */
export interface ApproverUserSource {
  /** Which ERP lookup the select drives. */
  apiType: 'employees' | 'users';
  /** Field on the fetched record that holds the *user* id. */
  valueKey?: string;
  /** `select` projection sent with the request. */
  attributes?: string[];
  /** ERP filter fragment, scoped to the workflow's companies. */
  customeFilter: Record<string, unknown>;
}

/**
 * Picks the directory behind the User approver.
 *
 * A workflow stores approvers as **user** ids, and there are two ways to reach
 * them:
 *
 * - With `employee` access, the employee directory is the better list — it
 *   carries display names, employment status and company scope, so
 *   `employees` is queried and projected down to each record's `user_id`.
 * - Without it, that endpoint is not readable, and the requirement is that the
 *   User option keeps working rather than disappearing. The `users` lookup is
 *   the fallback: its records *are* users, so their `id` is already the value
 *   the workflow stores and no projection is needed.
 *
 * Either way the persisted payload is identical, so a workflow authored by one
 * role opens correctly for the other.
 *
 * This hook only computes props. Nothing is fetched until the User approval
 * type is actually selected — the selector is not mounted before that, and
 * `SearchableSelect` fetches on open (plus once for preselected ids), never on
 * mount. Opening the action drawer therefore issues no user request at all.
 */
export const useApproverUserSource = (
  // Only the company scope narrows the directory, so ask for only that — a
  // caller holding a partial scope should not have to invent the rest.
  scope: Partial<Pick<WorkflowScope, 'company_ids'>>,
): ApproverUserSource => {
  const permissions = useApprovalPermissions();
  const canReadEmployees = permissions['employee.directory'];
  const companyIds = scope.company_ids;

  return useMemo(() => {
    const companies = companyIds ?? [];

    if (!canReadEmployees) {
      return {
        apiType: 'users',
        customeFilter: { '&company_id.in': companies },
      };
    }

    return {
      apiType: 'employees',
      valueKey: 'user_id',
      attributes: ['user_id'],
      // Employees with no linked user account cannot approve anything.
      customeFilter: { '&user_id.ne': null, '&company_id.in': companies },
    };
  }, [canReadEmployees, companyIds]);
};
