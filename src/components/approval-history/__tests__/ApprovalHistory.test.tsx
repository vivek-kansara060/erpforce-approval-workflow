import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ApprovalWorkflowProvider } from '../../../providers/ApprovalWorkflowProvider';
import { ApprovalHistory } from '../ApprovalHistory';
import type { HttpClient, HttpRequest } from '../../../types/http';

/**
 * @erpsquad/common is a host-supplied peer and is not installed here, so the
 * design-system boundary is replaced with plain MUI/DOM stand-ins.
 */
vi.mock('../../../ui', async () => {
  const { Button } = await import('@mui/material');
  return {
    Button,
    Typography: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const user = (first: string, last: string) => ({ id: 1, first_name: first, last_name: last });
const base = { entity_type: 'purchase_orders', entity_id: 42 };

/**
 * Round 1 was rejected at level 1; the record was resubmitted, level 1
 * approved it and level 2 is waiting on two approvers. Dates are years old so
 * the timeline shows absolute dates, which the test can assert on.
 */
const APPROVALS = [
  {
    ...base,
    id: 1,
    version: 1,
    approval_sequence: 1,
    status: 'Rejected',
    approver_data: user('Ann', 'Park'),
    comments: 'Quotes missing',
    created_by_user: 'Vivek Kansara',
    created_at: '2020-01-01T09:00:00Z',
    updated_at: '2020-01-01T10:00:00Z',
  },
  {
    ...base,
    id: 2,
    version: 2,
    approval_sequence: 1,
    status: 'Approved',
    approver_data: user('John', 'Doe'),
    comments: 'Within budget',
    created_by_user: 'Vivek Kansara',
    created_at: '2020-01-02T09:00:00Z',
    updated_at: '2020-01-02T10:00:00Z',
  },
  {
    ...base,
    id: 3,
    version: 2,
    approval_sequence: 2,
    status: 'Pending',
    approver_data: user('Priya', 'Shah'),
    comments: 'Finance approval required',
    created_by_user: 'John Doe',
    created_at: '2020-01-02T10:00:00Z',
  },
  {
    ...base,
    id: 4,
    version: 2,
    approval_sequence: 2,
    status: 'Pending',
    approver_data: user('Sam', 'Lee'),
    comments: 'Finance approval required',
    created_by_user: 'John Doe',
    created_at: '2020-01-02T10:00:00Z',
  },
];

const ok = (approvals: unknown[] = APPROVALS) =>
  vi.fn().mockResolvedValue({ data: { approvals, count: approvals.length } });

const setup = (
  props: Partial<Parameters<typeof ApprovalHistory>[0]> = {},
  http: ReturnType<typeof vi.fn> = ok(),
) => {
  render(
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={vi.fn()}
    >
      <ApprovalHistory
        entityType="purchase_orders"
        entityId={42}
        formatDate={(iso) => `at ${iso}`}
        {...props}
      />
    </ApprovalWorkflowProvider>,
  );
  return { http, user: userEvent.setup() };
};

const trigger = () => screen.getByRole('button', { name: /approval history/i });

const open = async (userEventApi: ReturnType<typeof userEvent.setup>) => {
  await userEventApi.click(trigger());
  await screen.findByText('Pending approval');
  return screen.getByRole('dialog');
};

describe('ApprovalHistory', () => {
  it('does not fetch until opened, then asks for the whole record', async () => {
    const { http, user: u } = setup();

    expect(trigger()).toBeEnabled();
    expect(http).not.toHaveBeenCalled();

    await open(u);

    expect(http).toHaveBeenCalledTimes(1);
    const request = http.mock.calls[0][0] as HttpRequest;
    expect(request.path).toBe('/v1/approvals/history');
    expect(request.query).toMatchObject({
      filters: '(entity_type.eq=purchase_orders&entity_id.eq=42)',
    });
  });

  it('summarises where the record stands and who it is waiting on', async () => {
    const { user: u } = setup();
    const dialog = await open(u);

    // In the summary chip and as the timeline step.
    expect(within(dialog).getAllByText('Level 2')).toHaveLength(2);
    // In the summary chip and as the latest round's header.
    expect(within(dialog).getAllByText('Round 2')).toHaveLength(2);
    expect(within(dialog).getByText('Waiting on', { exact: false })).toBeInTheDocument();
    expect(within(dialog).getByText('Priya Shah, Sam Lee')).toBeInTheDocument();
    expect(within(dialog).getByText('Requested by', { exact: false })).toBeInTheDocument();
  });

  it('lists each level with every approver, their status and remarks', async () => {
    const { user: u } = setup();
    const dialog = await open(u);

    expect(within(dialog).getByText('Resubmitted for approval')).toBeInTheDocument();
    expect(within(dialog).getByText('John Doe')).toBeInTheDocument();
    expect(within(dialog).getByText('Within budget')).toBeInTheDocument();
    expect(within(dialog).getByText('Finance approval required')).toBeInTheDocument();
    expect(within(dialog).getByText('Priya Shah')).toBeInTheDocument();
    expect(within(dialog).getByText('Sam Lee')).toBeInTheDocument();
    // Round header, level pill and the two approvers.
    expect(within(dialog).getAllByText('Pending')).toHaveLength(4);
    // Old timestamps render through the host's formatDate.
    expect(within(dialog).getAllByText('at 2020-01-02T10:00:00Z').length).toBeGreaterThan(0);
    // The earlier, rejected round stays folded.
    expect(within(dialog).queryByText('Quotes missing')).not.toBeInTheDocument();
  });

  it('unfolds an earlier round on request', async () => {
    const { user: u } = setup();
    const dialog = await open(u);

    await u.click(within(dialog).getByRole('button', { name: 'Show' }));

    expect(within(dialog).getByText('Submitted for approval')).toBeInTheDocument();
    expect(within(dialog).getByText('Quotes missing')).toBeInTheDocument();
    expect(within(dialog).getByText('Request rejected')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Hide' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('serves a reopen from cache instead of refetching', async () => {
    const { http, user: u } = setup();

    await open(u);
    await u.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await open(u);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when the record has no approvals', async () => {
    const { user: u } = setup({}, ok([]));
    await u.click(trigger());

    expect(await screen.findByText('No approval history')).toBeInTheDocument();
  });

  it('shows a retryable error without breaking the page', async () => {
    const http = vi
      .fn()
      .mockRejectedValueOnce(new Error('gateway down'))
      .mockResolvedValue({ data: { approvals: APPROVALS, count: 4 } });
    const { user: u } = setup({}, http);
    await u.click(trigger());

    expect(await screen.findByText('Failed to load approval history')).toBeInTheDocument();
    expect(screen.getByText('gateway down')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Pending approval')).toBeInTheDocument();
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('is disabled while the record has no id', () => {
    const { http } = setup({ entityId: undefined });

    expect(trigger()).toBeDisabled();
    expect(http).not.toHaveBeenCalled();
  });
});
