import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { WorkflowListView } from '../WorkflowListView';
import { ApprovalWorkflowProvider } from '../../../providers/ApprovalWorkflowProvider';
import { setErpPermissions } from '../../../test/stubs/erp-use-permissions';
import type { HttpClient, HttpRequest } from '../../../types/http';
import type * as ListComponents from '../../../components/list';
import type { DataTableProps } from '../../../components/list';

vi.mock('../../../ui', async () => (await import('../../../test/ui-stub')).uiStub);

/**
 * The grid is the host's MaterialTable, which is not installed here. This
 * stand-in runs each column's own `Cell` renderer and exposes each row action
 * as a button, which is everything the view hands the table.
 */
vi.mock('../../../components/list', async () => {
  const actual = await vi.importActual<typeof ListComponents>(
    '../../../components/list',
  );
  const DataTable = ({
    rows,
    columns,
    rowActions = [],
  }: DataTableProps<{ id: string; name: string }>) => (
    <div>
      {rows.map((row) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {columns.map((column) => (
            <span key={column.accessorKey}>
              {column.Cell({
                row: { original: row },
                renderedCellValue: (row as never)[column.accessorKey],
              })}
            </span>
          ))}
          {rowActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled?.(row)}
              onClick={() => action.handleAction(row)}
            >
              {`${action.label} ${row.name}`}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
  return { ...actual, DataTable };
});

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const LIVE = {
  _id: 'wf-1',
  name: 'Live flow',
  entity_type: 'purchase_orders',
  is_active: true,
  status: 'published',
  company_ids: [1, 2],
  department_ids: [7],
};
const PARKED = {
  _id: 'wf-2',
  name: 'Parked flow',
  entity_type: 'purchase_orders',
  is_active: false,
  status: 'draft',
};

let rows: unknown[];
let http: Mock<[HttpRequest], Promise<unknown>>;
const notify = vi.fn();

const workflowListCalls = () =>
  http.mock.calls
    .map(([request]) => request as HttpRequest)
    .filter((request) => request.method === 'GET' && request.path === '/v1/workflows');

const lastListQuery = () => workflowListCalls().at(-1)?.query as Record<string, string>;

const renderList = () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={vi.fn()}
      notify={notify}
      entityCatalogue={[{ value: 'purchase_orders', label: 'Purchase Orders' }]}
    >
      {children}
    </ApprovalWorkflowProvider>
  );
  return render(<WorkflowListView />, { wrapper });
};

beforeEach(() => {
  rows = [LIVE, PARKED];
  notify.mockClear();
  setErpPermissions({
    WorkflowAutomation: { canView: true, canViewById: true, canEdit: true, canDelete: true },
  });
  http = vi.fn(async (request: HttpRequest): Promise<unknown> => {
    if (request.method === 'POST' && request.path.endsWith('/toggle')) {
      return { data: { is_active: false } };
    }
    if (request.path === '/v1/workflows') {
      return { data: { workflows: rows }, pagination: { totalCount: rows.length } };
    }
    return { data: [] };
  });
});

describe('WorkflowListView', () => {
  it('summarises scope and shows the publish status in each row', async () => {
    renderList();

    const live = await screen.findByTestId('row-wf-1');
    expect(within(live).getByText('Companies (2), Departments (1)')).toBeInTheDocument();
    expect(within(live).getByText('Published')).toBeInTheDocument();
    expect(within(screen.getByTestId('row-wf-2')).getByText('Draft')).toBeInTheDocument();
    // No scope recorded: a dash, not "undefined".
    expect(within(screen.getByTestId('row-wf-2')).queryByText(/Companies/)).not.toBeInTheDocument();
  });

  // Filters are switched off (SHOW_STATUS_FILTERS); re-enable these with them.
  it.skip('asks the server for drafts only when the publish filter is set', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByTestId('row-wf-1');
    expect(lastListQuery().filters).not.toContain('status.eq');

    await user.click(screen.getByRole('combobox', { name: 'Publish status' }));
    await user.click(screen.getByRole('option', { name: 'Draft' }));

    await waitFor(() => expect(lastListQuery().filters).toContain('status.eq=draft'));
  });

  it.skip('combines the two filters', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByTestId('row-wf-1');

    await user.click(screen.getByRole('combobox', { name: 'Publish status' }));
    await user.click(screen.getByRole('option', { name: 'Published' }));
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'Active' }));

    await waitFor(() => {
      expect(lastListQuery().filters).toContain('status.eq=published');
      expect(lastListQuery().filters).toContain('is_active.eq=true');
    });
  });

  it.skip('offers a way out when a filter matches nothing, rather than "no workflows yet"', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByTestId('row-wf-1');

    rows = [];
    await user.click(screen.getByRole('combobox', { name: 'Publish status' }));
    await user.click(screen.getByRole('option', { name: 'Draft' }));

    expect(await screen.findByText('No matching workflows')).toBeInTheDocument();
    expect(screen.queryByText('No workflows yet')).not.toBeInTheDocument();

    rows = [LIVE, PARKED];
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));

    // The unfiltered page is served from the cache, so assert on what the user
    // sees: the rows are back and the dropdown is reset.
    expect(await screen.findByTestId('row-wf-1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Publish status' })).toHaveTextContent('All');
  });

  it('only offers the toggle that makes sense for each row', async () => {
    renderList();
    await screen.findByTestId('row-wf-1');

    expect(screen.getByRole('button', { name: 'Activate Live flow' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deactivate Live flow' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Activate Parked flow' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Deactivate Parked flow' })).toBeDisabled();
  });

  it('deactivates through the toggle endpoint and says so', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByTestId('row-wf-1');

    await user.click(screen.getByRole('button', { name: 'Deactivate Live flow' }));

    await waitFor(() =>
      expect(http).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', path: '/v1/workflows/wf-1/toggle' }),
      ),
    );
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Workflow deactivated', 'success'));
  });

  it('does not claim success when the server refuses', async () => {
    const user = userEvent.setup();
    const original = http.getMockImplementation() as (request: HttpRequest) => Promise<unknown>;
    http.mockImplementation(async (request: HttpRequest) => {
      if (request.path.endsWith('/toggle')) throw new Error('An active workflow already exists');
      return original(request);
    });
    renderList();
    await screen.findByTestId('row-wf-2');

    await user.click(screen.getByRole('button', { name: 'Activate Parked flow' }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(notify).not.toHaveBeenCalledWith('Workflow activated', 'success');
  });

  it('hides the toggles from a user who cannot edit', async () => {
    setErpPermissions({ WorkflowAutomation: { canView: true, canViewById: true } });
    renderList();
    await screen.findByTestId('row-wf-1');

    expect(screen.getByRole('button', { name: 'Deactivate Live flow' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Activate Parked flow' })).toBeDisabled();
  });
});
