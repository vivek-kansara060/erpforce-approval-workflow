import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApprovalWorkflowProvider } from '../../providers/ApprovalWorkflowProvider';
import { useApprovalHistory } from '../useApprovalHistory';
import type { UseApprovalHistoryOptions } from '../useApprovalHistory';
import type { HttpClient, HttpRequest } from '../../types/http';

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const setup = (response: unknown = { data: { approvals: [], count: 0 } }) => {
  const http = vi.fn().mockResolvedValue(response);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={vi.fn()}
    >
      {children}
    </ApprovalWorkflowProvider>
  );

  return { http, wrapper };
};

const render = (options: UseApprovalHistoryOptions, response?: unknown) => {
  const { http, wrapper } = setup(response);
  const hook = renderHook(() => useApprovalHistory(options), { wrapper });
  return { http, ...hook };
};

describe('useApprovalHistory', () => {
  it('asks GET /v1/approvals/history for every approver on the record', async () => {
    const { http, result } = render(
      { entityType: 'purchase_orders', entityId: 42 },
      {
        // The service's real envelope.
        data: {
          approvals: [
            {
              id: 1,
              entity_type: 'purchase_orders',
              entity_id: 42,
              status: 'Approved',
              version: 1,
              approval_sequence: 1,
              approver_data: { id: 9, first_name: 'John', last_name: 'Doe' },
              created_at: '2026-09-23T10:20:00Z',
              updated_at: '2026-09-23T10:30:00Z',
            },
            // Defensive: a row for another record is never shown.
            { id: 2, entity_type: 'purchase_orders', entity_id: 7, status: 'Pending' },
          ],
          count: 2,
        },
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(http).toHaveBeenCalledTimes(1);
    const request = http.mock.calls[0][0] as HttpRequest;
    expect(request).toMatchObject({ method: 'GET', path: '/v1/approvals/history' });
    expect(request.query).toEqual({
      skip: 0,
      limit: 100,
      order: 'created_at:1',
      select: expect.stringMatching(/^\[id,.*approver_data.*approval_sequence,version\]$/),
      filters: '(entity_type.eq=purchase_orders&entity_id.eq=42)',
    });

    expect(result.current.records.map((record) => record.id)).toEqual([1]);
    expect(result.current.rounds).toHaveLength(1);
    expect(result.current.summary).toMatchObject({ status: 'Approved' });
  });

  it('fetches nothing until enabled', () => {
    const { http, result } = render({
      entityType: 'purchase_orders',
      entityId: 42,
      enabled: false,
    });

    expect(http).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rounds).toEqual([]);
  });

  it('fetches nothing without both identifiers', () => {
    const { http, result } = render({ entityType: 'purchase_orders', entityId: undefined });

    expect(http).not.toHaveBeenCalled();
    expect(result.current.hasIdentity).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces a failed request as an error', async () => {
    const { http, wrapper } = setup();
    http.mockRejectedValueOnce(new Error('gateway down'));

    const { result } = renderHook(
      () => useApprovalHistory({ entityType: 'purchase_orders', entityId: 42 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.error?.message).toBe('gateway down'));
    expect(result.current.summary).toBeUndefined();
  });
});
