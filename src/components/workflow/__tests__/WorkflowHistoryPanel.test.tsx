import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WorkflowHistoryPanel } from '../WorkflowHistoryPanel';
import { ApprovalWorkflowProvider } from '../../../providers/ApprovalWorkflowProvider';
import type { HttpClient, HttpRequest } from '../../../types/http';
import type { WorkflowHistoryEntry } from '../../../types/workflow';

vi.mock('../../../ui', async () => (await import('../../../test/ui-stub')).uiStub);

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const entry = (overrides: Partial<WorkflowHistoryEntry>): WorkflowHistoryEntry => ({
  id: 'h',
  action: 'update',
  user_id: '7',
  user_name: 'Ann Park',
  previous: null,
  updated: null,
  created_at: '2026-10-16T10:00:00Z',
  ...overrides,
});

let http: Mock<[HttpRequest], Promise<unknown>>;

const renderPanel = (response: () => Promise<unknown>) => {
  http = vi.fn(async (request: HttpRequest): Promise<unknown> =>
    request.path === '/v1/workflows/wf-1/history' ? response() : { data: [] },
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={vi.fn()}
      entityCatalogue={[]}
    >
      {children}
    </ApprovalWorkflowProvider>
  );
  return render(<WorkflowHistoryPanel workflowId="wf-1" formatDate={() => '16 Oct 2026'} />, {
    wrapper,
  });
};

const historyOf = (...entries: WorkflowHistoryEntry[]) => async () => ({
  data: { history: entries },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WorkflowHistoryPanel', () => {
  it('asks the server for this workflow only', async () => {
    renderPanel(historyOf());
    await screen.findByText(/No changes recorded yet/);

    expect(http).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/v1/workflows/wf-1/history' }),
    );
  });

  it('says so when nothing has been recorded', async () => {
    renderPanel(historyOf());
    expect(await screen.findByText(/No changes recorded yet/)).toBeInTheDocument();
  });

  it('shows who did what, when, and what each field went from and to', async () => {
    renderPanel(
      historyOf(
        entry({
          id: 'a',
          previous: { name: 'Old name', is_active: true },
          updated: { name: 'New name', is_active: false },
        }),
      ),
    );

    expect(await screen.findByText('Ann Park')).toBeInTheDocument();
    expect(screen.getByText(/edited this workflow/)).toBeInTheDocument();
    expect(screen.getByText('16 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Title: Old name → New name')).toBeInTheDocument();
    expect(screen.getByText('Status: Active → Inactive')).toBeInTheDocument();
  });

  it('reads lists as counts and the flow as its size', async () => {
    renderPanel(
      historyOf(
        entry({
          previous: { company_ids: [1], graph: { nodes: 3, criteria: 1, stages: 2 } },
          updated: { company_ids: [1, 2], graph: { nodes: 6, criteria: 1, stages: 4 } },
        }),
      ),
    );

    expect(await screen.findByText('Companies: 1 selected → 2 selected')).toBeInTheDocument();
    expect(screen.getByText('Flow: 3 blocks, 2 stages → 6 blocks, 4 stages')).toBeInTheDocument();
  });

  it('shows a creation as an "after" only, and puts newest first as the server sent', async () => {
    renderPanel(
      historyOf(
        entry({ id: 'new', action: 'publish', updated: { status: 'published' } }),
        entry({ id: 'old', action: 'create', updated: { name: 'Fresh', status: 'draft' } }),
      ),
    );

    const published = await screen.findByText(/published this workflow/);
    const created = screen.getByText(/created this workflow/);
    expect(published.compareDocumentPosition(created) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Publish Status: Published')).toBeInTheDocument();
    expect(screen.getByText('Title: Fresh')).toBeInTheDocument();
  });

  it('falls back to the user id when the name cannot be resolved', async () => {
    renderPanel(historyOf(entry({ user_name: null, user_id: '42', action: 'delete' })));
    const row = (await screen.findByText(/deleted this workflow/)).closest('span') as HTMLElement;
    expect(within(row).getByText('User 42')).toBeInTheDocument();
  });

  it('shows an error with a way to retry when the request fails', async () => {
    renderPanel(async () => {
      throw new Error('boom');
    });
    expect(await screen.findByText(/boom|went wrong/i)).toBeInTheDocument();
  });
});
