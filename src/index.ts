/**
 * @erpsquad/approval-workflow
 *
 * Module-agnostic approval workflow builder and approval dashboard for ERPForce.
 *
 * The root entry re-exports everything a typical integration needs. For the
 * smallest bundle, import from the narrower entry points instead:
 *
 *   @erpsquad/approval-workflow/views/dashboard   – dashboard only (no React Flow)
 *   @erpsquad/approval-workflow/views/workflow    – workflow screens
 *   @erpsquad/approval-workflow/components/builder – the canvas on its own
 *   @erpsquad/approval-workflow/components/approval-history – history popover only
 *   @erpsquad/approval-workflow/hooks             – data hooks, no UI
 *   @erpsquad/approval-workflow/types             – types only, erased at build
 */

// Provider and integration surface.
export {
  ApprovalWorkflowProvider,
  useApprovalWorkflowConfig,
  useApprovalWorkflowContext,
  useApprovalWorkflowServices,
  useApprovalWorkflowApi,
  useQueryCache,
  useTranslate,
} from './providers';

// Screens.
export * from './views';

// Components (the builder stays behind its own entry point).
export * from './components';

// Hooks.
export * from './hooks';

// Module integration.
export * from './adapters';

// Permissions.
export * from './permissions';

// Transport and services, for hosts that drive the package programmatically.
export {
  createFetchHttpClient,
  createWorkflowApi,
  createApprovalApi,
  createReferenceApi,
  ENDPOINTS,
} from './api';
export type { WorkflowApi, ApprovalApi, ReferenceApi } from './api';
export { createWorkflowService, createApprovalService } from './services';
export type { WorkflowService, ApprovalService } from './services';

// Validation.
export * from './schemas';

// Pure helpers.
export * from './utils';

// Constants (field names, default columns, option lists).
export * from './constants';

// Types.
export * from './types';
