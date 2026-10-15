import { useMemo } from 'react';
import { useErpPermissionTree } from './erp-permission-tree';
import { resolveCapabilities } from './capabilities';
import type {
  ApprovalWorkflowCapability,
  ApprovalWorkflowPermissions,
  ErpPermissionTree,
} from '../types/permissions';

/**
 * One resolved capability set per permission tree, shared by every component.
 *
 * The ERP's `PermissionsProvider` memoises the tree, so its identity only
 * changes when the signed-in role's permissions change. Keying the cache on
 * that object means the matrix is computed once per change for the whole
 * screen, not once per component per render. A `WeakMap` keeps nothing alive
 * after a sign-out replaces the tree.
 */
const resolved = new WeakMap<ErpPermissionTree, ApprovalWorkflowPermissions>();

const capabilitiesFor = (tree: ErpPermissionTree): ApprovalWorkflowPermissions => {
  const cached = resolved.get(tree);
  if (cached) return cached;

  const capabilities = resolveCapabilities(tree);
  resolved.set(tree, capabilities);
  return capabilities;
};

/**
 * Every capability, derived from the ERP's global permission state.
 *
 * This is the package's only permission entry point. Read the flags you need
 * once per component and drive the UI from them:
 *
 * ```tsx
 * const permissions = useApprovalPermissions();
 * if (!permissions['applicable.grade']) return null;
 * ```
 *
 * The returned object is frozen and stable across renders, so it is safe in a
 * dependency array.
 */
export const useApprovalPermissions = (): ApprovalWorkflowPermissions => {
  const tree = useErpPermissionTree();
  return useMemo(() => capabilitiesFor(tree), [tree]);
};

/** One capability. Sugar over `useApprovalPermissions()` for single checks. */
export const usePermission = (capability: ApprovalWorkflowCapability): boolean =>
  useApprovalPermissions()[capability];
