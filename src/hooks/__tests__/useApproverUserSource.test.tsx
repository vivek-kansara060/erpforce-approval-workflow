import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ApprovalWorkflowProvider } from '../../providers/ApprovalWorkflowProvider';
import { useApproverUserSource } from '../useApproverUserSource';
import { setErpPermissions } from '../../test/stubs/erp-use-permissions';
import type { HttpClient, HttpRequest } from '../../types/http';

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const makeHttp = () =>
  vi.fn(async (request: HttpRequest) => {
    if (request.service === 'hrms') {
      return { data: { employees: [{ user_id: 2, name: 'Pooja Shah' }] } };
    }
    return {
      data: {
        users: [
          { id: 1, first_name: 'Priya', last_name: 'Sharma' },
          { id: 2, first_name: 'P.', last_name: 'Shah' },
        ],
      },
    };
  });

const setup = (http: ReturnType<typeof makeHttp>, scope = { company_ids: [7] }) => {
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
  return renderHook(() => useApproverUserSource(scope), { wrapper });
};

describe('useApproverUserSource', () => {
  it('fetches nothing until the select asks for options', () => {
    setErpPermissions({ Employee: { canView: true } });
    const http = makeHttp();

    setup(http);

    expect(http).not.toHaveBeenCalled();
  });

  it('with employee access, calls both directories and merges them on user id', async () => {
    setErpPermissions({ Employee: { canView: true } });
    const http = makeHttp();

    const { result } = setup(http);
    const page = await result.current.customFetchApi({ skip: 0, limit: 25 });

    const services = http.mock.calls.map(([request]) => request.service).sort();
    expect(services).toEqual(['hrms', 'rbac']);
    expect(page.data.map((c) => c.label)).toEqual(['Pooja Shah (P. Shah)', 'Priya Sharma']);
    expect(page.pagination.totalCount).toBe(2);
  });

  it('scopes both calls to the workflow companies', async () => {
    setErpPermissions({ Employee: { canView: true } });
    const http = makeHttp();

    const { result } = setup(http);
    await result.current.customFetchApi();

    for (const [request] of http.mock.calls) {
      expect(request.query?.filters).toContain('company_id.in=7');
    }
  });

  it('without employee access, calls only the users directory', async () => {
    setErpPermissions({});
    const http = makeHttp();

    const { result } = setup(http);
    const page = await result.current.customFetchApi();

    expect(http.mock.calls.map(([request]) => request.service)).toEqual(['rbac']);
    expect(page.data.map((c) => c.label)).toEqual(['P. Shah', 'Priya Sharma']);
  });

  it('serves later opens, searches and saved-id lookups from one cached load', async () => {
    setErpPermissions({ Employee: { canView: true } });
    const http = makeHttp();

    const { result } = setup(http);
    await result.current.customFetchApi();
    const search = await result.current.customFetchApi({ search: 'pooja' });
    const saved = await result.current.customFetchApi({ filters: { '&id.in': [1] } });

    expect(http).toHaveBeenCalledTimes(2);
    expect(search.data.map((c) => c.value)).toEqual([2]);
    expect(saved.data.map((c) => c.value)).toEqual([1]);
  });

  it('keeps a stable callback while the scope and permissions hold', () => {
    setErpPermissions({});
    const http = makeHttp();

    const { result, rerender } = setup(http);
    const first = result.current.customFetchApi;
    rerender();

    expect(result.current.customFetchApi).toBe(first);
  });
});
