/**
 * Permission contract.
 *
 * The package resolves permissions itself, from the ERP's global
 * `usePermissions()` hook in @erpsquad/common. A host neither supplies nor
 * configures them: it mounts the screens and the package reads the same RBAC
 * tree every other ERPForce screen reads.
 *
 * Capabilities are the package's own vocabulary — "may I delete a workflow?"
 * rather than "does `WorkflowAutomation.canDelete` exist?". The mapping from
 * RBAC keys to capabilities lives in exactly one place
 * (`permissions/capabilities.ts`), so a UI change never touches an RBAC key and
 * an RBAC change never touches a component.
 */

/** Every capability the package can gate on. */
export type ApprovalWorkflowCapability =
  // Workflow definition — `WorkflowAutomation`
  | 'workflow.view'
  | 'workflow.viewById'
  | 'workflow.create'
  | 'workflow.edit'
  | 'workflow.delete'
  | 'workflow.activate'
  // Approver strategies offered by the action drawer's Approval Type dropdown
  | 'workflow.approver.user'
  | 'workflow.approver.department'
  | 'workflow.approver.hierarchy'
  // Approval dashboard — `Approvals`
  | 'approval.view'
  | 'approval.viewById'
  | 'approval.approve'
  | 'approval.reject'
  // "Applicable" filters above the builder canvas
  | 'applicable.department'
  | 'applicable.grade'
  | 'applicable.employeeType'
  // Whether the employee directory is readable, which decides the data source
  // behind the User approver rather than whether it is offered at all.
  | 'employee.directory';

/** The fully resolved capability set, as `useApprovalPermissions()` returns it. */
export type ApprovalWorkflowPermissions = Readonly<
  Record<ApprovalWorkflowCapability, boolean>
>;

/** A partial capability set. Used by tests and by the resolver's own tables. */
export type CapabilityMap = Partial<Record<ApprovalWorkflowCapability, boolean>>;

/**
 * One node of the ERP permission tree.
 *
 * The tree builder in @erpsquad/common only ever writes `true`, so an absent
 * flag means "not granted" rather than "explicitly denied".
 */
export interface ErpPermissionNode {
  canView?: boolean;
  canViewById?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  actions?: Record<string, boolean>;
  [key: string]: unknown;
}

/** The permission tree returned by `usePermissions()` in @erpsquad/common. */
export type ErpPermissionTree = Record<string, ErpPermissionNode | undefined>;
