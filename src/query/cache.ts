import { toApprovalWorkflowError } from '../utils/errors';
import type { ApprovalWorkflowError, AsyncStatus } from '../types/common';
import type { QueryClientLike } from '../types/config';

/**
 * A small server-state cache.
 *
 * Why not Redux: the brief rules out Redux for server state, and the original
 * implementation's slices were largely boilerplate around four flags repeated
 * per thunk.
 *
 * Why not react-query: it would add a runtime dependency for the whole ERP
 * ecosystem, and the package needs exactly three of its behaviours —
 * request de-duplication, staleness, and key-prefix invalidation.
 *
 * Everything here is framework-agnostic; `useQuery` adapts it to React via
 * `useSyncExternalStore`.
 */

export interface CacheEntry<T = unknown> {
  data: T | undefined;
  error: ApprovalWorkflowError | undefined;
  status: AsyncStatus;
  /** Epoch ms of the last settle; 0 when never fetched. */
  updatedAt: number;
  /** True while refreshing data that is already on screen. */
  isRefetching: boolean;
}

type Listener = () => void;
type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

/** Told about every fetch that fails (cancellations excluded), once per failure. */
export type QueryErrorListener = (error: ApprovalWorkflowError, key: readonly unknown[]) => void;

interface InternalEntry<T = unknown> {
  key: string;
  data: T | undefined;
  error: ApprovalWorkflowError | undefined;
  status: AsyncStatus;
  updatedAt: number;
  isRefetching: boolean;

  /** Frozen view handed to React; replaced (never mutated) on every change. */
  snapshot: CacheEntry<T>;

  listeners: Set<Listener>;
  inFlight: Promise<T> | undefined;
  controller: AbortController | undefined;
  /** Retained so `invalidate` can refetch a key that still has subscribers. */
  lastFetcher: Fetcher<T> | undefined;
}

const IDLE_SNAPSHOT: CacheEntry<never> = Object.freeze({
  data: undefined,
  error: undefined,
  status: 'idle' as const,
  updatedAt: 0,
  isRefetching: false,
});

export const serializeKey = (key: readonly unknown[]): string => JSON.stringify(key);

/**
 * A background refetch triggered by `invalidate` has no caller to reject to.
 * Its failure is not lost: it is recorded on the entry (so the view renders it)
 * and handed to every `onError` listener.
 */
const recordedOnEntry = () => undefined;

export class QueryCache implements QueryClientLike {
  private readonly entries = new Map<string, InternalEntry>();
  private readonly errorListeners = new Set<QueryErrorListener>();

  /**
   * Subscribes to fetch failures across every key — the hook for logging and
   * telemetry. Reported once per failed request, however many components are
   * reading the key. Returns an unsubscribe function.
   */
  onError(listener: QueryErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /** Stable snapshot for `useSyncExternalStore`. */
  getSnapshot<T>(key: readonly unknown[]): CacheEntry<T> {
    const entry = this.entries.get(serializeKey(key)) as InternalEntry<T> | undefined;
    return entry?.snapshot ?? (IDLE_SNAPSHOT as CacheEntry<T>);
  }

  subscribe(key: readonly unknown[], listener: Listener): () => void {
    const entry = this.ensure(key);
    entry.listeners.add(listener);

    return () => {
      entry.listeners.delete(listener);
      // Nobody is waiting on this request any more.
      if (entry.listeners.size === 0 && entry.inFlight) {
        entry.controller?.abort();
        entry.inFlight = undefined;
        entry.controller = undefined;
      }
    };
  }

  /**
   * Resolves from cache when fresh, joins the in-flight request when one is
   * already running, and only then hits the network. This is what removes the
   * duplicate requests the original views issued on every mount and re-render.
   */
  fetch<T>(
    key: readonly unknown[],
    fetcher: Fetcher<T>,
    options: { staleTime: number; force?: boolean },
  ): Promise<T> {
    const entry = this.ensure<T>(key);
    entry.lastFetcher = fetcher;

    if (entry.inFlight) return entry.inFlight;

    const isFresh = entry.status === 'success' && Date.now() - entry.updatedAt < options.staleTime;
    if (isFresh && !options.force) {
      return Promise.resolve(entry.data as T);
    }

    const controller = new AbortController();
    entry.controller = controller;
    entry.isRefetching = entry.status === 'success';
    entry.status = entry.status === 'success' ? 'success' : 'loading';
    entry.error = undefined;
    this.commit(entry);

    const promise = fetcher(controller.signal)
      .then((data) => {
        entry.data = data;
        entry.status = 'success';
        entry.error = undefined;
        entry.updatedAt = Date.now();
        return data;
      })
      .catch((cause: unknown) => {
        // An abort is a cancellation, not a failure: keep the previous state.
        if (controller.signal.aborted) throw cause;
        const error = toApprovalWorkflowError(cause);
        entry.error = error;
        entry.status = 'error';
        entry.updatedAt = Date.now();
        this.reportError(error, key);
        throw error;
      })
      .finally(() => {
        entry.inFlight = undefined;
        entry.controller = undefined;
        entry.isRefetching = false;
        this.commit(entry);
      });

    entry.inFlight = promise;
    return promise;
  }

  /** Write a value straight into the cache (optimistic update, prefetch). */
  setData<T>(key: readonly unknown[], data: T): void {
    const entry = this.ensure<T>(key);
    entry.data = data;
    entry.status = 'success';
    entry.error = undefined;
    entry.updatedAt = Date.now();
    this.commit(entry);
  }

  /**
   * Marks every entry under `keyPrefix` stale. Entries that still have mounted
   * subscribers are refetched immediately; the rest are dropped so they refetch
   * on next mount.
   */
  invalidate(keyPrefix: readonly unknown[]): void {
    const exact = serializeKey(keyPrefix);
    // `["workflow"]` -> `["workflow",` so `["workflowX"]` does not match.
    const childPrefix = `${exact.slice(0, -1)},`;

    for (const [serialized, entry] of [...this.entries]) {
      if (serialized !== exact && !serialized.startsWith(childPrefix)) continue;

      entry.updatedAt = 0;

      if (entry.listeners.size > 0 && entry.lastFetcher) {
        void this.fetch(JSON.parse(serialized) as unknown[], entry.lastFetcher, {
          staleTime: 0,
          force: true,
        }).catch(recordedOnEntry);
      } else {
        entry.controller?.abort();
        this.entries.delete(serialized);
      }
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) entry.controller?.abort();
    this.entries.clear();
  }

  private ensure<T>(key: readonly unknown[]): InternalEntry<T> {
    const serialized = serializeKey(key);
    const existing = this.entries.get(serialized) as InternalEntry<T> | undefined;
    if (existing) return existing;

    const entry: InternalEntry<T> = {
      key: serialized,
      data: undefined,
      error: undefined,
      status: 'idle',
      updatedAt: 0,
      isRefetching: false,
      snapshot: IDLE_SNAPSHOT as CacheEntry<T>,
      listeners: new Set(),
      inFlight: undefined,
      controller: undefined,
      lastFetcher: undefined,
    };
    this.entries.set(serialized, entry as InternalEntry);
    return entry;
  }

  /**
   * A throwing listener is a host bug, and must neither mask the fetch error
   * nor stop the remaining listeners; it is surfaced on the console instead.
   */
  private reportError(error: ApprovalWorkflowError, key: readonly unknown[]): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error, key);
      } catch (listenerError) {
        console.error('[approval-workflow] onError listener threw', listenerError);
      }
    }
  }

  /** Rebuild the immutable snapshot, then notify subscribers. */
  private commit(entry: InternalEntry): void {
    entry.snapshot = Object.freeze({
      data: entry.data,
      error: entry.error,
      status: entry.status,
      updatedAt: entry.updatedAt,
      isRefetching: entry.isRefetching,
    });
    for (const listener of entry.listeners) listener();
  }
}

export const createQueryCache = (): QueryCache => new QueryCache();
