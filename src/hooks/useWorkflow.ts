import { useMemo } from 'react';
import { useCachedQuery } from './internal/useCachedQuery';
import { useReportedMutation } from './internal/useReportedMutation';
import { queryKeys } from '../constants/query-keys';
import { toWorkflowFormValues, toDuplicateFormValues } from '../utils/workflow-payload';
import {
  useApprovalWorkflowConfig,
  useApprovalWorkflowServices,
} from '../providers/useApprovalWorkflowConfig';
import type { ApprovalWorkflowError } from '../types/common';
import type { Workflow, WorkflowFormValues } from '../types/workflow';
import type { SaveWorkflowInput } from '../services/workflow.service';

/**
 * A single workflow, plus the form values derived from it.
 *
 * `mode: 'duplicate'` returns the same record with its identity stripped, which
 * is how the list screen's Duplicate action is implemented — the original
 * achieved this by pushing the whole record through router state and then
 * nulling `id` in an effect.
 */
export const useWorkflow = (
  id: string | undefined,
  options: { mode?: 'edit' | 'duplicate' } = {},
) => {
  const { workflow } = useApprovalWorkflowServices();
  const { moduleContext } = useApprovalWorkflowConfig();

  const query = useCachedQuery<Workflow>(
    queryKeys.workflow.detail(id ?? ''),
    (signal) => workflow.getById(id as string, signal),
    { enabled: Boolean(id) },
  );

  const formValues = useMemo<WorkflowFormValues>(
    () =>
      options.mode === 'duplicate'
        ? toDuplicateFormValues(query.data, moduleContext.module)
        : toWorkflowFormValues(query.data, moduleContext.module),
    [query.data, moduleContext.module, options.mode],
  );

  return {
    workflow: query.data,
    formValues,
    isLoading: Boolean(id) && query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Delete, shared by `useWorkflowMutations` and `useWorkflowList`.
 *
 * Resolves `true` on success and `undefined` on failure, so a caller can tell
 * the two apart — a `void` result could not, which is how a failed delete used
 * to be announced as a successful one.
 */
export const useRemoveWorkflow = (onError?: (error: ApprovalWorkflowError) => void) => {
  const { workflow } = useApprovalWorkflowServices();
  return useReportedMutation<string, true>(
    'workflow.remove',
    async (id) => {
      await workflow.remove(id);
      return true;
    },
    { onError },
  );
};

export interface UseWorkflowMutationsOptions {
  /**
   * Called when a save or delete fails, after the error has gone to
   * `config.onError`. The package's own screens use it to notify the user.
   */
  onError?: (error: ApprovalWorkflowError, operation: 'save' | 'remove') => void;
}

/**
 * Create / update / delete.
 *
 * `useMutation` ignores calls while one is in flight, which removes the
 * double-submit the original save buttons allowed, and the service invalidates
 * the list cache so the user sees the new record without a manual refetch.
 *
 * Both writes resolve `undefined` on failure; the error is on `saveError` /
 * `removeError` and is passed to `onError`.
 */
export const useWorkflowMutations = (options: UseWorkflowMutationsOptions = {}) => {
  const { onError } = options;
  const { workflow } = useApprovalWorkflowServices();

  const save = useReportedMutation<SaveWorkflowInput, Workflow>(
    'workflow.save',
    (input) => workflow.save(input),
    { onError: onError && ((error) => onError(error, 'save')) },
  );
  const remove = useRemoveWorkflow(onError && ((error) => onError(error, 'remove')));

  return {
    save: save.mutate,
    isSaving: save.isLoading,
    saveError: save.error,
    remove: remove.mutate,
    isRemoving: remove.isLoading,
    removeError: remove.error,
    validate: workflow.validate,
  };
};
