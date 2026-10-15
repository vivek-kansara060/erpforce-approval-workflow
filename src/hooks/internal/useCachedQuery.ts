import { useQuery } from '../../query/useQuery';
import { useApprovalWorkflowContext } from '../../providers/useApprovalWorkflowConfig';
import type { UseQueryResult } from '../../query/useQuery';

/**
 * `useQuery` bound to the provider's cache, defaulting to its `staleTime`.
 * Every server-state hook in the package reads through this. Internal.
 */
export const useCachedQuery = <T>(
  key: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean; staleTime?: number } = {},
): UseQueryResult<T> => {
  const { cache, config } = useApprovalWorkflowContext();
  return useQuery<T>(cache, key, fetcher, {
    enabled: options.enabled,
    staleTime: options.staleTime ?? config.staleTime,
  });
};
