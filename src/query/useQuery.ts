import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { QueryCache } from './cache';
import { serializeKey } from './cache';
import type { AsyncState } from '../types/common';

export interface UseQueryOptions {
  /** Skip the request entirely (missing id, closed sidebar, no permission). */
  enabled?: boolean;
  /** Milliseconds a cached value stays fresh. Falls back to the provider value. */
  staleTime?: number;
}

export interface UseQueryResult<T> extends AsyncState<T> {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<T | undefined>;
}

/**
 * Reads one key from the cache and keeps it fresh.
 *
 * The fetcher is held in a ref so callers can pass an inline arrow function
 * without re-triggering the effect — a re-render never causes a second request,
 * only a genuine key change does.
 */
export const useQuery = <T>(
  cache: QueryCache,
  key: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UseQueryOptions & { staleTime: number },
): UseQueryResult<T> => {
  const { enabled = true, staleTime } = options;
  const serializedKey = serializeKey(key);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // `key` is often an inline array literal; re-derive a stable one from its
  // serialisation so downstream identity checks are based on value, not identity.
  const stableKey = useMemo(() => JSON.parse(serializedKey) as unknown[], [serializedKey]);

  const subscribe = useCallback(
    (listener: () => void) => cache.subscribe(stableKey, listener),
    [cache, stableKey],
  );

  const getSnapshot = useCallback(() => cache.getSnapshot<T>(stableKey), [cache, stableKey]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const run = useCallback(
    (force: boolean) =>
      cache
        .fetch<T>(stableKey, (signal) => fetcherRef.current(signal), { staleTime, force })
        .catch(() => undefined),
    [cache, stableKey, staleTime],
  );

  useEffect(() => {
    if (!enabled) return;
    void run(false);
  }, [enabled, run]);

  const refetch = useCallback(() => run(true), [run]);

  return {
    data: snapshot.data,
    error: snapshot.error,
    status: enabled ? snapshot.status : 'idle',
    isRefetching: snapshot.isRefetching,
    isLoading: enabled && (snapshot.status === 'loading' || snapshot.status === 'idle'),
    isError: snapshot.status === 'error',
    isSuccess: snapshot.status === 'success',
    refetch,
  };
};
