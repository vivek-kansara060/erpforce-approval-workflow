import { useMemo } from 'react';
import { usePagedList } from './internal/usePagedList';
import { useRemoveWorkflow, useToggleWorkflow } from './useWorkflow';
import { queryKeys } from '../constants/query-keys';
import { WORKFLOW_LIST_COLUMNS } from '../constants/columns';
import { WORKFLOW_REQUIRED_SELECT_FIELDS } from '../constants/fields';
import { buildWorkflowFilter } from '../utils/filters';
import {
  useApprovalWorkflowConfig,
  useApprovalWorkflowServices,
} from '../providers/useApprovalWorkflowConfig';
import type { ApprovalWorkflowError } from '../types/common';
import type { Workflow, WorkflowListFilters } from '../types/workflow';

export interface UseWorkflowListOptions {
  filters?: WorkflowListFilters;
  /** Restrict to the hosting module. @default true */
  scopeToModule?: boolean;
  resource?: string;
  /** Called when `deleteWorkflow` fails, after `config.onError`. */
  onDeleteError?: (error: ApprovalWorkflowError) => void;
  /** Called when `toggleWorkflow` fails, e.g. a duplicate live workflow. */
  onToggleError?: (error: ApprovalWorkflowError) => void;
}

/**
 * Workflow list: server-side search, sorting, filtering and pagination, backed
 * by the shared query cache.
 *
 * Requests are keyed by the exact query object, so changing the page and coming
 * back is served from cache and a re-render never refetches.
 */
export const useWorkflowList = (options: UseWorkflowListOptions = {}) => {
  const { filters, scopeToModule = true,
    resource = 'approval-workflow',
    onDeleteError,
    onToggleError,
  } = options;

  const { workflow } = useApprovalWorkflowServices();
  const { moduleContext } = useApprovalWorkflowConfig();

  const viewFilter = useMemo(
    () =>
      buildWorkflowFilter({
        ...(scopeToModule ? { module: moduleContext.module } : {}),
        ...filters,
      }),
    [scopeToModule, moduleContext.module, filters],
  );

  const list = usePagedList<Workflow>({
    resource,
    columns: WORKFLOW_LIST_COLUMNS,
    requiredFields: WORKFLOW_REQUIRED_SELECT_FIELDS,
    viewFilter,
    queryKey: queryKeys.workflow.list,
    fetchPage: workflow.list,
  });

  const remove = useRemoveWorkflow(onDeleteError);
  const toggle = useToggleWorkflow(onToggleError);

  return {
    ...list,
    deleteWorkflow: remove.mutate,
    isDeleting: remove.isLoading,
    toggleWorkflow: toggle.mutate,
    isToggling: toggle.isLoading,
  };
};
