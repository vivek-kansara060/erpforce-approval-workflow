import { useCallback } from 'react';
import { useApprovalWorkflowConfig } from '../../providers/useApprovalWorkflowConfig';
import type { ApprovalRequest } from '../../types/approval';

/**
 * How the dashboard screens present and open the record behind a request —
 * its title and its route both come from the entity type's adapter.
 *
 * Shared by the queue and the detail screen so the row link, the View action
 * and the detail header can never disagree about where a record lives.
 */
export const useApprovalRecordLinks = () => {
  const { modules, navigate, translate } = useApprovalWorkflowConfig();

  /** The adapter's title (a translation key or literal), else the raw entity type. */
  const entityTitle = useCallback(
    (request: ApprovalRequest) => {
      const { title } = modules.get(request.entity_type);
      return title ? translate(title, title) : request.entity_type;
    },
    [modules, translate],
  );

  /** Where a request's record lives, or `undefined` when it has no route. */
  const recordRoute = useCallback(
    (request: ApprovalRequest) => modules.get(request.entity_type).getRecordRoute?.(request),
    [modules],
  );

  const openRecord = useCallback(
    (request: ApprovalRequest) => {
      const route = recordRoute(request);
      if (route) navigate(route, { state: { fromApprovals: true } });
    },
    [recordRoute, navigate],
  );

  return { entityTitle, recordRoute, openRecord };
};
