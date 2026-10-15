import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApprovalWorkflowProvider } from '../../providers/ApprovalWorkflowProvider';
import { useEntityCatalogue } from '../useWorkflowReferences';
import type { EntityCatalogueEntry } from '../../types/common';
import type { HttpClient } from '../../types/http';

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

const modulesResponse = {
  data: {
    modules: [
      {
        sub_modules: [
          { name: 'Purchase Order', value: 'purchase_orders', is_workflow_enabled: true },
          { name: 'Requisition', value: 'purchase_requisitions', is_workflow_enabled: false },
          { name: 'Vendor', value: 'vendors' },
        ],
      },
    ],
  },
};

const setup = (entityCatalogue?: EntityCatalogueEntry[]) => {
  const http = vi.fn().mockResolvedValue(modulesResponse);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApprovalWorkflowProvider
      http={http as unknown as HttpClient}
      moduleContext={{ module: 'procurement' }}
      currentUser={{ id: 1 }}
      routes={routes}
      navigate={vi.fn()}
      entityCatalogue={entityCatalogue}
    >
      {children}
    </ApprovalWorkflowProvider>
  );

  return { http, wrapper };
};

const valuesOf = (entries: Array<{ value: string }>) => entries.map((entry) => entry.value);

describe('useEntityCatalogue', () => {
  it('lists only sub-modules flagged is_workflow_enabled: true', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useEntityCatalogue(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(valuesOf(result.current.catalogue)).toEqual(['purchase_orders']);
  });

  it('still resolves labels for disabled entities', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useEntityCatalogue(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.labelOf('purchase_requisitions')).toBe('Requisition');
  });

  it('keeps the selected entity listed after it was disabled', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useEntityCatalogue({ selectedValue: 'purchase_requisitions' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(valuesOf(result.current.catalogue)).toEqual([
      'purchase_orders',
      'purchase_requisitions',
    ]);
  });

  it('lists host-supplied entries unless they opt out', () => {
    const { http, wrapper } = setup([
      { label: 'Purchase Order', value: 'purchase_orders' },
      { label: 'Requisition', value: 'purchase_requisitions', is_workflow_enabled: false },
    ]);
    const { result } = renderHook(() => useEntityCatalogue(), { wrapper });

    expect(valuesOf(result.current.catalogue)).toEqual(['purchase_orders']);
    expect(http).not.toHaveBeenCalled();
  });
});
