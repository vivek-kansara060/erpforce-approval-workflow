import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { WorkflowFormView } from '../WorkflowFormView';
import { ApprovalWorkflowProvider } from '../../../providers/ApprovalWorkflowProvider';
import { setErpPermissions } from '../../../test/stubs/erp-use-permissions';
import type { HttpClient, HttpRequest } from '../../../types/http';

vi.mock('../../../ui', async () => (await import('../../../test/ui-stub')).uiStub);

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const workflow = (status: 'draft' | 'published') => ({
  _id: 'wf-1',
  name: 'Purchase approval',
  entity_type: 'purchase_orders',
  module: 'procurement',
  status,
  is_active: true,
  company_ids: [1],
  graph: {
    nodes: [
      {
        id: 't1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Purchase Orders', trigger: 'purchase_orders' },
      },
    ],
    edges: [],
  },
});

const navigate = vi.fn();
const notify = vi.fn();
let http: Mock<[HttpRequest], Promise<unknown>>;

const writes = () =>
  http.mock.calls
    .map(([request]) => request as HttpRequest)
    .filter((request) => request.method === 'PUT' || request.method === 'POST');

const renderEdit = (status: 'draft' | 'published') => {
  http = vi.fn(async (request: HttpRequest): Promise<unknown> => {
    if (request.method === 'GET' && request.path === '/v1/workflows/wf-1') {
      return { data: { workflow: workflow(status) } };
    }
    if (request.method === 'PUT') return { data: { workflow: workflow('published') } };
    return { data: [] };
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={navigate}
      notify={notify}
      entityCatalogue={[{ value: 'purchase_orders', label: 'Purchase Orders' }]}
    >
      {children}
    </ApprovalWorkflowProvider>
  );

  return render(<WorkflowFormView mode="edit" workflowId="wf-1" />, { wrapper });
};

/** Waits for the record to load and the form to take its values. */
const loaded = async () =>
  waitFor(() =>
    expect(screen.getByPlaceholderText('Enter workflow title')).toHaveValue('Purchase approval'),
  );

beforeEach(() => {
  navigate.mockClear();
  notify.mockClear();
  setErpPermissions({ WorkflowAutomation: { canView: true, canViewById: true, canEdit: true } });
});

describe('WorkflowFormView: publishing', () => {
  it('asks before a draft goes live, and publishes only once confirmed', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const dialog = await screen.findByRole('dialog', { name: 'Publish workflow' });
    expect(writes()).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({
      method: 'PUT',
      path: '/v1/workflows/wf-1',
      body: expect.objectContaining({ status: 'published' }),
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/wf'));
  });

  it('writes nothing if the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    const dialog = await screen.findByRole('dialog', { name: 'Publish workflow' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Publish workflow' })).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('updates a live workflow straight away, under its own label', async () => {
    const user = userEvent.setup();
    renderEdit('published');
    await loaded();

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(screen.queryByRole('dialog', { name: 'Publish workflow' })).not.toBeInTheDocument();
  });

  it('does not ask (or write) while the form is invalid', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    await user.clear(screen.getByPlaceholderText('Enter workflow title'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog', { name: 'Publish workflow' })).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });
});

describe('WorkflowFormView: discarding', () => {
  it('leaves at once when nothing has changed', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(navigate).toHaveBeenCalledWith('/wf');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks first once something has changed, and keeps the work on "Keep editing"', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    await user.type(screen.getByPlaceholderText('Enter workflow title'), ' v2');
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    const dialog = await screen.findByRole('dialog', { name: 'Warning' });
    expect(within(dialog).getByText(/unsaved changes/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter workflow title')).toHaveValue('Purchase approval v2');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves once the user confirms', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    await user.type(screen.getByPlaceholderText('Enter workflow title'), ' v2');
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Warning' });
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }));

    expect(navigate).toHaveBeenCalledWith('/wf');
  });

  it('warns the browser on reload or tab close only once there are unsaved edits', async () => {
    const user = userEvent.setup();
    renderEdit('draft');
    await loaded();

    const attempt = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(attempt()).toBe(false);
    await user.type(screen.getByPlaceholderText('Enter workflow title'), 'x');
    expect(attempt()).toBe(true);
  });
});

describe('WorkflowFormView: status', () => {
  it('shows where the workflow is in its lifecycle', async () => {
    renderEdit('draft');
    await loaded();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
