import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TestRunDrawer } from '../TestRunDrawer';
import { ApprovalWorkflowProvider } from '../../../../providers/ApprovalWorkflowProvider';
import type { HttpClient, HttpRequest } from '../../../../types/http';
import type { SimulationResult } from '../../../../types/workflow';
import type { WorkflowGraph } from '../../../../types/graph';

vi.mock('../../../../ui', async () => (await import('../../../../test/ui-stub')).uiStub);

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const GRAPH: WorkflowGraph = {
  nodes: [
    {
      id: 't1',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { label: 'Purchase Orders', trigger: 'purchase_orders' },
    },
    {
      id: 'c1',
      type: 'criteria',
      position: { x: 0, y: 0 },
      parentId: 't1',
      data: {
        label: 'Large order',
        conditions: [
          {
            condition_type: 'operator',
            field: 'purchase_orders.total_amount',
            sub_module: 'purchase_orders',
            operator: '>',
            value: 1000,
          },
        ],
      },
    },
  ],
  edges: [{ id: 'e1', source: 't1', target: 'c1' }],
};

const RESULT: SimulationResult = {
  trigger: { trigger_id: 't1', event_type: 'onCreate' },
  outcome: 'approval',
  steps: [
    {
      action_id: 'c1',
      name: 'Large order',
      type: 'criteria',
      passed: true,
      conditions: [{ field: 'total_amount', operator: '>', expected: 1000, actual: 5000, passed: true }],
    },
    {
      action_id: 'c1-pass-1',
      name: 'Manager approval',
      type: 'approval',
      approver: { approver_type: 'USER' },
      next_level: ['Finance approval'],
      after_rejection: ['Escalate'],
    },
  ],
};

let http: Mock<[HttpRequest], Promise<unknown>>;
const notify = vi.fn();

const simulateCalls = () =>
  http.mock.calls
    .map(([request]) => request)
    .filter((request) => request.path === '/v1/workflows/simulate');

const renderDrawer = (result: unknown = { data: RESULT }) => {
  http = vi.fn(async (request: HttpRequest): Promise<unknown> =>
    request.path === '/v1/workflows/simulate' ? result : { data: [] },
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={vi.fn()}
      notify={notify}
      entityCatalogue={[]}
    >
      {children}
    </ApprovalWorkflowProvider>
  );
  return render(
    <TestRunDrawer isOpen onClose={vi.fn()} graph={GRAPH} entityType="purchase_orders" />,
    { wrapper },
  );
};

const sampleBox = () => screen.getByRole('textbox') as HTMLInputElement;

beforeEach(() => notify.mockClear());

describe('TestRunDrawer', () => {
  it('starts from the values the criteria compare against', () => {
    renderDrawer();
    expect(JSON.parse(sampleBox().value)).toEqual({ total_amount: 1000 });
  });

  it('refuses a sample that is not JSON, without calling the server', async () => {
    const user = userEvent.setup();
    renderDrawer();

    fireEvent.change(sampleBox(), { target: { value: 'not json' } });
    await user.click(screen.getByRole('button', { name: 'Run test' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
    expect(simulateCalls()).toHaveLength(0);
  });

  it('rejects JSON that is not an object', async () => {
    const user = userEvent.setup();
    renderDrawer();

    fireEvent.change(sampleBox(), { target: { value: '[1, 2]' } });
    await user.click(screen.getByRole('button', { name: 'Run test' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(simulateCalls()).toHaveLength(0);
  });

  it('sends the graph and the sample, in the saved shape', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Run test' }));

    await waitFor(() => expect(simulateCalls()).toHaveLength(1));
    const body = simulateCalls()[0].body as {
      graph: WorkflowGraph;
      entity_data: unknown;
      entity_type: string;
      module: string;
    };
    expect(simulateCalls()[0].method).toBe('POST');
    expect(body.entity_data).toEqual({ total_amount: 1000 });
    expect(body.entity_type).toBe('purchase_orders');
    expect(body.module).toBe('procurement');
    // The editor's `entity.field` is sent as the bare field the backend reads.
    const criteria = body.graph.nodes.find((node) => node.type === 'criteria');
    expect((criteria?.data as { conditions: Array<{ field: string }> }).conditions[0].field).toBe(
      'total_amount',
    );
  });

  it('shows each step: the criteria with what it saw, then the approval', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Run test' }));

    expect(await screen.findByText('This request would go to approval.')).toBeInTheDocument();
    expect(screen.getByText('Criteria met')).toBeInTheDocument();
    expect(screen.getByText('total_amount > 1000 (got 5000)')).toBeInTheDocument();
    expect(screen.getByText('2. Manager approval')).toBeInTheDocument();
    expect(screen.getByText('Then: Finance approval')).toBeInTheDocument();
    expect(screen.getByText('After rejection: Escalate')).toBeInTheDocument();
  });

  it('shows a step that could not be checked, rather than a verdict', async () => {
    const user = userEvent.setup();
    renderDrawer({
      data: {
        trigger: RESULT.trigger,
        outcome: 'incomplete',
        steps: [
          { action_id: 'c1', name: 'Large order', type: 'criteria', error: 'Cannot fetch vendors' },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: 'Run test' }));

    expect(await screen.findByText('A step could not be checked. See below.')).toBeInTheDocument();
    expect(screen.getByText('Cannot fetch vendors')).toBeInTheDocument();
    expect(screen.queryByText('Criteria met')).not.toBeInTheDocument();
  });

  it('tells the user when nothing would run', async () => {
    const user = userEvent.setup();
    renderDrawer({ data: { trigger: RESULT.trigger, outcome: 'no-approval', steps: [] } });

    await user.click(screen.getByRole('button', { name: 'Run test' }));

    expect(await screen.findByText('Nothing would run for this request.')).toBeInTheDocument();
  });

  it('reports a failed request instead of showing a stale result', async () => {
    const user = userEvent.setup();
    renderDrawer();
    http.mockImplementation(async (request: HttpRequest) => {
      if (request.path === '/v1/workflows/simulate') throw new Error('Workflow must have a trigger');
      return { data: [] };
    });

    await user.click(screen.getByRole('button', { name: 'Run test' }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(screen.queryByText('Result')).not.toBeInTheDocument();
  });
});
