import { describe, expect, it, vi } from 'vitest';
import { createQueryCache } from '../cache';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('QueryCache', () => {
  it('de-duplicates concurrent requests for the same key', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValue('value');

    await Promise.all([
      cache.fetch(['k'], fetcher, { staleTime: 1000 }),
      cache.fetch(['k'], fetcher, { staleTime: 1000 }),
      cache.fetch(['k'], fetcher, { staleTime: 1000 }),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves a fresh value from cache without hitting the network', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValue('value');

    await cache.fetch(['k'], fetcher, { staleTime: 10_000 });
    await cache.fetch(['k'], fetcher, { staleTime: 10_000 });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the value is stale', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValue('value');

    await cache.fetch(['k'], fetcher, { staleTime: 0 });
    await cache.fetch(['k'], fetcher, { staleTime: 0 });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refetches when forced, even while fresh', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValue('value');

    await cache.fetch(['k'], fetcher, { staleTime: 10_000 });
    await cache.fetch(['k'], fetcher, { staleTime: 10_000, force: true });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keys by value, not identity', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValue('value');

    await cache.fetch(['list', { page: 1 }], fetcher, { staleTime: 10_000 });
    await cache.fetch(['list', { page: 1 }], fetcher, { staleTime: 10_000 });
    await cache.fetch(['list', { page: 2 }], fetcher, { staleTime: 10_000 });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('records a normalised error and keeps serving it', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(cache.fetch(['k'], fetcher, { staleTime: 0 })).rejects.toThrow('boom');

    const snapshot = cache.getSnapshot(['k']);
    expect(snapshot.status).toBe('error');
    expect(snapshot.error?.message).toBe('boom');
  });

  it('notifies subscribers with a new snapshot identity', async () => {
    const cache = createQueryCache();
    const listener = vi.fn();

    cache.subscribe(['k'], listener);
    const before = cache.getSnapshot(['k']);

    await cache.fetch(['k'], async () => 'value', { staleTime: 0 });

    expect(listener).toHaveBeenCalled();
    expect(cache.getSnapshot(['k'])).not.toBe(before);
    expect(cache.getSnapshot(['k']).data).toBe('value');
  });

  it('invalidates by key prefix', async () => {
    const cache = createQueryCache();

    await cache.fetch(['workflow', 'list', 1], async () => 'a', { staleTime: 10_000 });
    await cache.fetch(['approval', 'list', 1], async () => 'b', { staleTime: 10_000 });

    cache.invalidate(['workflow']);

    expect(cache.getSnapshot(['workflow', 'list', 1]).status).toBe('idle');
    expect(cache.getSnapshot(['approval', 'list', 1]).data).toBe('b');
  });

  it('does not invalidate a key that merely shares a prefix string', async () => {
    const cache = createQueryCache();

    await cache.fetch(['workflow'], async () => 'a', { staleTime: 10_000 });
    await cache.fetch(['workflowX'], async () => 'b', { staleTime: 10_000 });

    cache.invalidate(['workflow']);

    expect(cache.getSnapshot(['workflowX']).data).toBe('b');
  });

  it('refetches an invalidated key that still has subscribers', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValue('value');

    cache.subscribe(['k'], () => {});
    await cache.fetch(['k'], fetcher, { staleTime: 10_000 });

    cache.invalidate(['k']);
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('marks a background refresh of already-present data', async () => {
    const cache = createQueryCache();
    cache.subscribe(['k'], () => {});

    await cache.fetch(['k'], async () => 'first', { staleTime: 10_000 });

    let resolveSecond: (value: string) => void = () => {};
    const pending = cache.fetch(
      ['k'],
      () => new Promise<string>((resolve) => { resolveSecond = resolve; }),
      { staleTime: 0, force: true },
    );

    expect(cache.getSnapshot(['k']).isRefetching).toBe(true);
    expect(cache.getSnapshot(['k']).data).toBe('first');

    resolveSecond('second');
    await pending;

    expect(cache.getSnapshot(['k']).isRefetching).toBe(false);
    expect(cache.getSnapshot(['k']).data).toBe('second');
  });

  it('setData writes straight into the cache', () => {
    const cache = createQueryCache();
    cache.setData(['k'], { id: 1 });

    expect(cache.getSnapshot(['k'])).toMatchObject({ status: 'success', data: { id: 1 } });
  });

  it('clear drops everything', async () => {
    const cache = createQueryCache();
    await cache.fetch(['k'], async () => 'value', { staleTime: 10_000 });

    cache.clear();
    expect(cache.getSnapshot(['k']).status).toBe('idle');
  });

  it('reports each failed fetch to onError listeners once, with its key', async () => {
    const cache = createQueryCache();
    const listener = vi.fn();
    cache.onError(listener);

    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    // Three concurrent readers share one request, so one report.
    await Promise.allSettled([
      cache.fetch(['k', 1], fetcher, { staleTime: 0 }),
      cache.fetch(['k', 1], fetcher, { staleTime: 0 }),
      cache.fetch(['k', 1], fetcher, { staleTime: 0 }),
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].message).toBe('boom');
    expect(listener.mock.calls[0][1]).toEqual(['k', 1]);
  });

  it('does not report a cancelled fetch', async () => {
    const cache = createQueryCache();
    const listener = vi.fn();
    cache.onError(listener);

    const unsubscribe = cache.subscribe(['k'], () => undefined);
    const pending = cache
      .fetch(
        ['k'],
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
        { staleTime: 0 },
      )
      .catch(() => undefined);

    // The last subscriber leaving aborts the request.
    unsubscribe();
    await pending;

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps reporting when a listener throws, and stops after unsubscribe', async () => {
    const cache = createQueryCache();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const healthy = vi.fn();
    cache.onError(() => {
      throw new Error('listener bug');
    });
    const stop = cache.onError(healthy);

    await cache.fetch(['a'], () => Promise.reject(new Error('x')), { staleTime: 0 }).catch(() => 0);
    expect(healthy).toHaveBeenCalledTimes(1);

    stop();
    await cache.fetch(['b'], () => Promise.reject(new Error('y')), { staleTime: 0 }).catch(() => 0);
    expect(healthy).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
