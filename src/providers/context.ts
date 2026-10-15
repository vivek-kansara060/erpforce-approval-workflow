import { createContext } from 'react';
import type { QueryCache } from '../query/cache';
import type { ErrorReporter, ResolvedApprovalWorkflowConfig } from '../types/config';
import type { ApprovalApi } from '../api/approval.api';
import type { ReferenceApi } from '../api/reference.api';
import type { WorkflowApi } from '../api/workflow.api';
import type { ApprovalService } from '../services/approval.service';
import type { WorkflowService } from '../services/workflow.service';

/**
 * What the provider puts on the context: the resolved config plus the singleton
 * API clients, services and cache derived from it. Building these once here is
 * what keeps hooks from re-creating a client on every render.
 */
export interface ApprovalWorkflowContextValue {
  config: ResolvedApprovalWorkflowConfig;
  cache: QueryCache;
  api: {
    workflow: WorkflowApi;
    approval: ApprovalApi;
    reference: ReferenceApi;
  };
  services: {
    workflow: WorkflowService;
    approval: ApprovalService;
  };
  /**
   * Forwards a failure to `config.onError`. Stable for the provider's lifetime
   * and a no-op when the host supplied none. Query failures are reported by the
   * provider itself; hooks call this for failed writes.
   */
  reportError: ErrorReporter;
}

export const ApprovalWorkflowContext = createContext<ApprovalWorkflowContextValue | null>(null);

ApprovalWorkflowContext.displayName = 'ApprovalWorkflowContext';
