/**
 * Test stub for `@erpsquad/common/hooks/use-permissions`.
 *
 * @erpsquad/common is a private peer dependency supplied by the host, so it is
 * not installed here. `vite.config.ts` aliases the hook's import specifier to
 * this module for tests only — the build still externalises the real package.
 *
 * Deliberately not a React hook: the real one is a `useContext` read, and
 * tests care about what the tree contains, not how it is delivered.
 */

import type { ErpPermissionTree } from '../../types/permissions';

let tree: ErpPermissionTree = {};

/** Installs the permission tree the next render will see. */
export const setErpPermissions = (next: ErpPermissionTree): void => {
  // A fresh object per call, so the capability cache keyed on tree identity
  // does not serve one test's answer to the next.
  tree = { ...next };
};

export const usePermissions = (): ErpPermissionTree => tree;
