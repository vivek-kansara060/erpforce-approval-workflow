import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApprovalWorkflowProvider } from '../ApprovalWorkflowProvider';
import { useApprovalWorkflowContext } from '../useApprovalWorkflowConfig';
import { createQueryCache } from '../../query/cache';
import { useWorkflow, useWorkflowMutations } from '../../hooks/useWorkflow';
import { ApprovalWorkflowError } from '../../types/common';
import type { ApprovalWorkflowProviderProps } from '../../types/config';
import type { HttpClient } from '../../types/http';

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

/** Props are built once per wrapper, as a host holding them in state would. */
const makeWrapper = (overrides: Partial<ApprovalWorkflowProviderProps> = {}) => {
  const props = {
    http: vi.fn().mockResolvedValue({}) as unknown as HttpClient,
    moduleContext: { module: 'hrms' },
    currentUser: { id: 1 },
    routes,
    navigate: vi.fn(),
    notify: vi.fn(),
    ...overrides,
  };

  return ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider {...props}>{children}</ApprovalWorkflowProvider>
  );
};

describe('ApprovalWorkflowProvider', () => {
  it('rejects a configuration missing its transport with a clear error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      renderHook(() => useApprovalWorkflowContext(), {
        wrapper: makeWrapper({ http: undefined as unknown as HttpClient }),
      }),
    ).toThrow(/Invalid <ApprovalWorkflowProvider> configuration: `http`/);

    consoleError.mockRestore();
  });

  it('uses a host-supplied QueryCache, so two providers share responses', async () => {
    const shared = createQueryCache();
    const http = vi.fn().mockResolvedValue({ data: { workflow: { _id: 'w1', name: 'A' } } });
    const wrapper = makeWrapper({ queryClient: shared, http: http as unknown as HttpClient });

    const first = renderHook(() => useWorkflow('w1'), { wrapper });
    await waitFor(() => expect(first.result.current.workflow?.name).toBe('A'));

    const second = renderHook(() => useWorkflow('w1'), { wrapper });
    expect(second.result.current.workflow?.name).toBe('A');
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('reports a failed read to onError with the query key', async () => {
    const onError = vi.fn();
    const http = vi.fn().mockRejectedValue(new ApprovalWorkflowError('Gone', { status: 404 }));
    const wrapper = makeWrapper({ onError, http: http as unknown as HttpClient });

    renderHook(() => useWorkflow('w404'), { wrapper });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0]).toMatchObject({ message: 'Gone', status: 404 });
    expect(onError.mock.calls[0][1]).toEqual({
      source: 'query',
      key: ['workflow', 'detail', 'w404'],
    });
  });

  it('reports a failed write to onError and to the hook’s own onError', async () => {
    const onError = vi.fn();
    const hookOnError = vi.fn();
    const http = vi.fn().mockRejectedValue(new ApprovalWorkflowError('Locked', { status: 423 }));
    const wrapper = makeWrapper({ onError, http: http as unknown as HttpClient });

    const { result } = renderHook(() => useWorkflowMutations({ onError: hookOnError }), {
      wrapper,
    });

    let outcome: true | undefined = true;
    await act(async () => {
      outcome = await result.current.remove('w1');
    });

    expect(outcome).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Locked' }), {
      source: 'mutation',
      operation: 'workflow.remove',
    });
    expect(hookOnError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Locked' }),
      'remove',
    );
  });

  it('resolves remove with true on success, so callers can tell it apart from a failure', async () => {
    const { result } = renderHook(() => useWorkflowMutations(), { wrapper: makeWrapper() });

    let outcome: true | undefined;
    await act(async () => {
      outcome = await result.current.remove('w1');
    });

    expect(outcome).toBe(true);
  });

  it('keeps the context value stable across re-renders with the same config', () => {
    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(() => useApprovalWorkflowContext(), { wrapper });
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
  });
});
