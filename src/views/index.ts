/**
 * Screens.
 *
 * Both groups are also available as narrower entry points, so a module that
 * only renders the dashboard never pulls the builder (and @xyflow/react) into
 * its bundle:
 *
 *   import { ApprovalDashboardView } from '@erpsquad/approval-workflow/views/dashboard'
 *   import { WorkflowListView }      from '@erpsquad/approval-workflow/views/workflow'
 */

export * from './ApprovalWorkflow';
export * from './ApprovalDashboard';
