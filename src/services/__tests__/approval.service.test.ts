import { describe, expect, it, vi } from 'vitest';
import { createApprovalService } from '../approval.service';
import { createQueryCache } from '../../query/cache';
import { createModuleRegistry, defineModuleAdapter } from '../../adapters/module-registry';
import type { ApprovalApi } from '../../api/approval.api';
import type { ApprovalRequest } from '../../types/approval';

const request = (overrides: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 'req-1',
  entity_type: 'leave_requests',
  entity_id: 101,
  status: 'Pending',
  ...overrides,
});

const makeApi = (): ApprovalApi => ({
  list: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  listHistory: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getById: vi.fn().mockResolvedValue(request()),
  getHistory: vi.fn().mockResolvedValue([]),
  act: vi.fn().mockResolvedValue({}),
});

describe('submitDecision', () => {
  it('falls back to the generic endpoint when no adapter handles the entity', async () => {
    const api = makeApi();
    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry(),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Approved',
      formData: 'Looks good',
    });

    expect(api.act).toHaveBeenCalledWith({
      id: '101',
      status: 'Approved',
      comments: 'Looks good',
    });
  });

  it('reads comments from an object payload', async () => {
    const api = makeApi();
    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry(),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Rejected',
      formData: { remarks: 'Insufficient balance' },
    });

    expect(api.act).toHaveBeenCalledWith(
      expect.objectContaining({ comments: 'Insufficient balance' }),
    );
  });

  it('delegates to the adapter when one is registered', async () => {
    const api = makeApi();
    const submitDecision = vi.fn().mockResolvedValue(undefined);

    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry([
        defineModuleAdapter('leave_requests', { submitDecision }),
      ]),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Approved',
      formData: { remarks: 'ok' },
    });

    expect(submitDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'Approved', entityId: '101' }),
    );
    expect(api.act).not.toHaveBeenCalled();
  });

  it('suppresses the package endpoint when callDecisionApi is false', async () => {
    const api = makeApi();
    const submitDecision = vi.fn().mockResolvedValue(undefined);

    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry([
        defineModuleAdapter('leave_requests', { callDecisionApi: false, submitDecision }),
      ]),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Approved',
      formData: null,
    });

    expect(submitDecision).toHaveBeenCalledTimes(1);
    expect(api.act).not.toHaveBeenCalled();
  });

  it('suppresses the package endpoint with no submitDecision at all', async () => {
    const api = makeApi();
    const cache = createQueryCache();
    const invalidate = vi.spyOn(cache, 'invalidate');

    const service = createApprovalService({
      api,
      cache,
      modules: createModuleRegistry([
        defineModuleAdapter('leave_requests', { callDecisionApi: false }),
      ]),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Approved',
      formData: null,
    });

    expect(api.act).not.toHaveBeenCalled();
    // Still a decision as far as the cache is concerned.
    expect(invalidate).toHaveBeenCalledWith(['approval']);
  });

  it('runs the adapter and then the package endpoint when callDecisionApi is true', async () => {
    const api = makeApi();
    const order: string[] = [];
    const submitDecision = vi.fn(() => {
      order.push('adapter');
    });
    (api.act as ReturnType<typeof vi.fn>).mockImplementation(() => {
      order.push('api');
      return Promise.resolve({});
    });

    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry([
        defineModuleAdapter('leave_requests', { callDecisionApi: true, submitDecision }),
      ]),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Approved',
      formData: 'ok',
    });

    expect(order).toEqual(['adapter', 'api']);
  });

  it('does not mark the request decided when the adapter throws', async () => {
    const api = makeApi();
    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry([
        defineModuleAdapter('leave_requests', {
          callDecisionApi: true,
          submitDecision: () => Promise.reject(new Error('gateway down')),
        }),
      ]),
    });

    await expect(
      service.submitDecision({ request: request(), decision: 'Approved', formData: null }),
    ).rejects.toThrow('gateway down');

    expect(api.act).not.toHaveBeenCalled();
  });

  it('lets the fallback adapter switch the default off for every entity type', async () => {
    const api = makeApi();
    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry([], defineModuleAdapter('*', { callDecisionApi: false })),
    });

    await service.submitDecision({
      request: request({ entity_type: 'anything_at_all' }),
      decision: 'Rejected',
      formData: null,
    });

    expect(api.act).not.toHaveBeenCalled();
  });

  it('skips the API entirely when the adapter handles its own submission', async () => {
    const api = makeApi();
    const submitDecision = vi.fn();

    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry([
        defineModuleAdapter('terminations', { handlesOwnSubmission: true, submitDecision }),
      ]),
    });

    await service.submitDecision({
      request: request({ entity_type: 'terminations' }),
      decision: 'Approved',
      formData: null,
    });

    expect(api.act).not.toHaveBeenCalled();
    expect(submitDecision).not.toHaveBeenCalled();
  });

  it('refuses to re-decide a request that has already settled', async () => {
    const api = makeApi();
    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry(),
    });

    await expect(
      service.submitDecision({
        request: request({ status: 'Approved' }),
        decision: 'Rejected',
        formData: null,
      }),
    ).rejects.toThrow(/can no longer be actioned/);

    expect(api.act).not.toHaveBeenCalled();
  });

  it('invalidates the approval cache after a decision', async () => {
    const cache = createQueryCache();
    const invalidate = vi.spyOn(cache, 'invalidate');

    const service = createApprovalService({
      api: makeApi(),
      cache,
      modules: createModuleRegistry(),
    });

    await service.submitDecision({
      request: request(),
      decision: 'Approved',
      formData: null,
    });

    expect(invalidate).toHaveBeenCalledWith(['approval']);
  });

  it('falls back to `id` when the request carries no entity_id', async () => {
    const api = makeApi();
    const service = createApprovalService({
      api,
      cache: createQueryCache(),
      modules: createModuleRegistry(),
    });

    await service.submitDecision({
      request: { id: 'req-9', entity_type: 'x', entity_id: undefined as never, status: 'Pending' },
      decision: 'Approved',
      formData: null,
    });

    expect(api.act).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-9' }));
  });
});

describe('runPreAction', () => {
  it('invokes the adapter pre-action and invalidates', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const cache = createQueryCache();
    const invalidate = vi.spyOn(cache, 'invalidate');

    const service = createApprovalService({
      api: makeApi(),
      cache,
      modules: createModuleRegistry([
        defineModuleAdapter('hire_requests', {
          preAction: {
            shouldShow: () => true,
            label: 'Add budget',
            component: () => null,
            submit,
            successMessage: 'Budget added',
          },
        }),
      ]),
    });

    const target = request({ entity_type: 'hire_requests' });
    await service.runPreAction({ request: target, formData: { amount: 10 } });

    expect(submit).toHaveBeenCalledWith({ amount: 10 }, target);
    expect(invalidate).toHaveBeenCalledWith(['approval']);
  });

  it('throws when the entity type has no pre-action', async () => {
    const service = createApprovalService({
      api: makeApi(),
      cache: createQueryCache(),
      modules: createModuleRegistry(),
    });

    await expect(
      service.runPreAction({ request: request(), formData: {} }),
    ).rejects.toThrow(/No pre-action configured/);
  });
});
