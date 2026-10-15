import type { ReactElement, ReactNode } from 'react';
import { usePermission } from './usePermission';
import { PermissionDeniedState } from '../components/feedback/PermissionDeniedState';
import type { ApprovalWorkflowCapability } from '../types/permissions';

export interface PermissionGateProps {
  capability: ApprovalWorkflowCapability;
  children: ReactNode;
  /**
   * What to render when the capability is denied.
   * `null` hides the subtree; omit it for the standard denied state.
   */
  fallback?: ReactNode;
}

/**
 * Renders `children` only when the capability is granted.
 *
 * Route-level gating stays the host's job (it owns the router); this is for
 * gating buttons, columns and sections inside the package's own screens.
 */
export const PermissionGate = ({
  capability,
  children,
  fallback,
}: PermissionGateProps): ReactElement | null => {
  const allowed = usePermission(capability);

  if (allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <PermissionDeniedState />;
};
