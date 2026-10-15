/**
 * The boundary to the ERP's global permission system.
 *
 * This is the ONLY module in `src/` outside `ui/` that imports
 * @erpsquad/common. Everything else asks for a capability. A host on a
 * different RBAC system replaces this module and `capabilities.ts` and nothing
 * else changes.
 *
 * `usePermissions()` is a context read: the tree is built once by the ERP's
 * `PermissionsProvider` and its identity only changes when the signed-in role's
 * permissions change. Calling it in several components costs nothing.
 */

import { usePermissions as useErpPermissions } from '@erpsquad/common/hooks/use-permissions';
import type { ErpPermissionTree } from '../types/permissions';

/**
 * The ERP permission tree for the signed-in user.
 *
 * Throws through from @erpsquad/common when no `PermissionsProvider` is
 * mounted — the same failure every other ERPForce screen produces, and a far
 * better signal than silently denying every capability.
 */
export const useErpPermissionTree = (): ErpPermissionTree =>
  (useErpPermissions() ?? {}) as ErpPermissionTree;
