/**
 * The ERP RBAC module keys this package reads.
 *
 * These are the keys of the permission tree returned by `usePermissions()` in
 * @erpsquad/common — they are ERP-wide names owned by the backend's
 * `role-permission` payload, not names this package invents. They are declared
 * once here so a component never carries a bare string literal and a backend
 * rename is a one-line change.
 *
 * `employee` is lower-case because that is how the requirement specifies it;
 * `readPermissionNode` matches tree keys case-insensitively, so it resolves
 * against the `Employee` node the tree builder actually produces.
 */
export const PERMISSION_KEYS = {
  /** Approval Workflow configuration (list, create, edit, delete). */
  workflow: 'WorkflowAutomation',
  /** Approval Dashboard (queue, approve, reject). */
  approvals: 'Approvals',
  /**
   * The same dashboard rights under the shared ERP-wide resource. Read only
   * when the role carries nothing under `Approvals`.
   */
  commonApprovals: 'ErpCommonApprovals',
  /** Department master — gates the Department approver and Applicable filter. */
  departments: 'Departments',
  /** Grade master — gates the Grade Applicable filter. */
  grades: 'Grades',
  /** Employee master — gates Employee Type and selects the user data source. */
  employee: 'employee',
  /** Organisation structure — gates the Hierarchy approver. */
  hierarchy: 'OrganisationStructure',
} as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];
