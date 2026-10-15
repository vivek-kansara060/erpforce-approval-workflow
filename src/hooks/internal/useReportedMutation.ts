import { useMutation } from '../../query/useMutation';
import { useApprovalWorkflowContext } from '../../providers/useApprovalWorkflowConfig';
import type { UseMutationOptions, UseMutationResult } from '../../query/useMutation';
import type { ApprovalErrorContext } from '../../types/config';

type MutationOperation = Extract<ApprovalErrorContext, { source: 'mutation' }>['operation'];

/** `useMutation` whose failures are also forwarded to `config.onError`. Internal. */
export const useReportedMutation = <TInput, TResult>(
  operation: MutationOperation,
  mutationFn: (input: TInput) => Promise<TResult>,
  options: UseMutationOptions<TInput, TResult> = {},
): UseMutationResult<TInput, TResult> => {
  const { reportError } = useApprovalWorkflowContext();
  const { onError } = options;

  return useMutation(mutationFn, {
    ...options,
    onError: (error, input) => {
      reportError(error, { source: 'mutation', operation });
      onError?.(error, input);
    },
  });
};
