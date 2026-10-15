/**
 * Permission surface.
 *
 * Permissions come from the ERP's global `usePermissions()` hook in
 * @erpsquad/common. Nothing here is configured by the host — these exports
 * exist so a host can *read* the same capabilities the package gates on (for
 * its own route guards or menu entries), not so it can supply them.
 */

export { useApprovalPermissions, usePermission } from './usePermission';
export { PermissionGate } from './PermissionGate';
export type { PermissionGateProps } from './PermissionGate';
export { resolveCapabilities, readPermissionNode } from './capabilities';
export { selectApproverTypeOptions, selectApplicableFilters } from './derive-options';
export { PERMISSION_KEYS } from './permission-keys';
export type { PermissionKey } from './permission-keys';
export type {
  ApprovalWorkflowCapability,
  ApprovalWorkflowPermissions,
  CapabilityMap,
  ErpPermissionNode,
  ErpPermissionTree,
} from '../types/permissions';
