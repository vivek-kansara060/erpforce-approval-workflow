import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApprovalWorkflowProvider } from '../../providers/ApprovalWorkflowProvider';
import { createModuleRegistry, defineModuleAdapter } from '../../adapters/module-registry';
import { useApprovalDecision } from '../useApprovalDecision';
import { ApprovalWorkflowError } from '../../types/common';
import type { ApprovalModuleAdapter } from '../../types/module';
import type { ApprovalRequest } from '../../types/approval';
import type { HttpClient } from '../../types/http';

const request: ApprovalRequest = {
  id: 'req-1',
  entity_type: 'leave_requests',
  entity_id: 101,
  status: 'Pending',
};

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const setup = (options: { adapters?: ApprovalModuleAdapter[]; http?: HttpClient } = {}) => {
  const notify = vi.fn();
  const navigate = vi.fn();
  const http = options.http ?? (vi.fn().mockResolvedValue({}) as unknown as HttpClient);
  const modules = createModuleRegistry(options.adapters ?? []);
  const moduleContext = { module: 'hrms' };
  const currentUser = { id: 1 };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http}
      moduleContext={moduleContext}
      currentUser={currentUser}
      routes={routes}
      navigate={navigate}
      notify={notify}
      modules={modules}
    >
      {children}
    </ApprovalWorkflowProvider>
  );

  return { wrapper, notify, http };
};

describe('useApprovalDecision', () => {
  it('opens and closes the decision modal', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useApprovalDecision(), { wrapper });

    expect(result.current.decisionState.open).toBe(false);

    act(() => result.current.openDecision(request, 'Approved'));
    expect(result.current.decisionState).toMatchObject({
      open: true,
      decision: 'Approved',
      request,
    });

    act(() => result.current.closeDecision());
    expect(result.current.decisionState.open).toBe(false);
  });

  it('submits the decision, notifies and calls onCompleted', async () => {
    const { wrapper, notify, http } = setup();
    const onCompleted = vi.fn();

    const { result } = renderHook(() => useApprovalDecision({ onCompleted }), { wrapper });

    act(() => result.current.openDecision(request, 'Approved'));
    await act(async () => {
      result.current.confirmDecision('Looks fine');
    });

    await waitFor(() => expect(onCompleted).toHaveBeenCalled());

    expect(http).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PATCH', path: '/v1/approvals/101' }),
    );
    expect(notify).toHaveBeenCalledWith('Request approved successfully', 'success');
    expect(result.current.decisionState.open).toBe(false);
  });

  it('surfaces a failure as an error notification and keeps the modal open', async () => {
    const http = vi.fn().mockRejectedValue(new Error('Already approved')) as unknown as HttpClient;
    const { wrapper, notify } = setup({ http });
    const onCompleted = vi.fn();

    const { result } = renderHook(() => useApprovalDecision({ onCompleted }), { wrapper });

    act(() => result.current.openDecision(request, 'Rejected'));
    await act(async () => {
      result.current.confirmDecision('no');
    });

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Already approved', 'error'));
    expect(onCompleted).not.toHaveBeenCalled();
    expect(result.current.decisionState.open).toBe(true);
  });

  it('does nothing when confirmed without an open decision', async () => {
    const { wrapper, http } = setup();
    const { result } = renderHook(() => useApprovalDecision(), { wrapper });

    await act(async () => {
      result.current.confirmDecision('x');
    });

    expect(http).not.toHaveBeenCalled();
  });

  it('routes the decision through a module adapter when one is registered', async () => {
    const submitDecision = vi.fn().mockResolvedValue(undefined);
    const { wrapper, http } = setup({
      adapters: [defineModuleAdapter('leave_requests', { submitDecision })],
    });

    const { result } = renderHook(() => useApprovalDecision(), { wrapper });

    act(() => result.current.openDecision(request, 'Approved'));
    await act(async () => {
      result.current.confirmDecision({ remarks: 'ok' });
    });

    await waitFor(() => expect(submitDecision).toHaveBeenCalled());
    expect(http).not.toHaveBeenCalled();
  });

  it('opens the pre-action modal only for an entity type that declares one', () => {
    const { wrapper } = setup({
      adapters: [
        defineModuleAdapter('hire_requests', {
          preAction: {
            shouldShow: () => true,
            label: 'Add budget',
            component: () => null,
            submit: vi.fn(),
            successMessage: 'Budget added',
          },
        }),
      ],
    });

    const { result } = renderHook(() => useApprovalDecision(), { wrapper });

    act(() => result.current.openPreAction(request));
    expect(result.current.preActionState.open).toBe(false);

    act(() =>
      result.current.openPreAction({ ...request, entity_type: 'hire_requests' }),
    );
    expect(result.current.preActionState.open).toBe(true);
  });

  it('runs the pre-action and notifies with its success message', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const { wrapper, notify } = setup({
      adapters: [
        defineModuleAdapter('hire_requests', {
          preAction: {
            shouldShow: () => true,
            label: 'Add budget',
            component: () => null,
            submit,
            successMessage: 'Budget added',
          },
        }),
      ],
    });

    const { result } = renderHook(() => useApprovalDecision(), { wrapper });
    const target = { ...request, entity_type: 'hire_requests' };

    act(() => result.current.openPreAction(target));
    await act(async () => {
      result.current.confirmPreAction({ amount: 500 });
    });

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ amount: 500 }, target));
    expect(notify).toHaveBeenCalledWith('Budget added', 'success');
    expect(result.current.preActionState.open).toBe(false);
  });

  it('startApproval opens a pending pre-action instead of the decision modal', () => {
    const shouldShow = vi.fn((candidate: ApprovalRequest) => candidate.id === 'needs-budget');
    const { wrapper } = setup({
      adapters: [
        defineModuleAdapter('hire_requests', {
          preAction: {
            shouldShow,
            label: 'Add budget',
            component: () => null,
            submit: vi.fn(),
            successMessage: 'Budget added',
          },
        }),
      ],
    });

    const { result } = renderHook(() => useApprovalDecision(), { wrapper });
    const gated = { ...request, id: 'needs-budget', entity_type: 'hire_requests' };
    const ready = { ...request, id: 'ready', entity_type: 'hire_requests' };

    expect(result.current.getPendingPreAction(gated)).toBeDefined();
    expect(result.current.getPendingPreAction(ready)).toBeUndefined();

    act(() => result.current.startApproval(gated));
    expect(result.current.preActionState.open).toBe(true);
    expect(result.current.decisionState.open).toBe(false);

    act(() => result.current.closePreAction());
    act(() => result.current.startApproval(ready));
    expect(result.current.decisionState).toMatchObject({ open: true, decision: 'Approved' });
  });

  it('shows the generic message, not the server text, for a server fault', async () => {
    const http = vi
      .fn()
      .mockRejectedValue(
        new ApprovalWorkflowError('TypeError: cannot read x of undefined at worker.js:12', {
          status: 500,
        }),
      ) as unknown as HttpClient;
    const { wrapper, notify } = setup({ http });

    const { result } = renderHook(() => useApprovalDecision(), { wrapper });
    act(() => result.current.openDecision(request, 'Approved'));
    await act(async () => {
      result.current.confirmDecision('ok');
    });

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Something went wrong', 'error'));
  });

  it('returns the same object across re-renders while nothing changes', () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useApprovalDecision(), { wrapper });
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
    expect(result.current.startApproval).toBe(first.startApproval);
  });
});
