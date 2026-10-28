import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { ApprovalWorkflowProvider } from '../providers/ApprovalWorkflowProvider';
import type { HttpClient } from '../types/http';

const routes = {
  workflowList: '/wf',
  workflowCreate: '/wf/new',
  workflowEdit: '/wf/:id/edit',
  workflowView: '/wf/:id',
  approvalDashboard: '/approvals',
  approvalView: '/approvals/:id',
};

/** Provider with a transport that returns an empty reference list. */
export const Wrapper = ({ children }: { children: ReactNode }) => (
  <ApprovalWorkflowProvider
    http={vi.fn().mockResolvedValue({ data: [] }) as unknown as HttpClient}
    moduleContext={{ module: 'procurement' }}
    currentUser={{ id: 1 }}
    routes={routes}
    navigate={vi.fn()}
    entityCatalogue={[]}
  >
    {children}
  </ApprovalWorkflowProvider>
);
