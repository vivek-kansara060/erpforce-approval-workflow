import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApprovalPermissions, usePermission } from '../usePermission';
import { setErpPermissions } from '../../test/stubs/erp-use-permissions';
import { PERMISSION_KEYS } from '../permission-keys';

describe('useApprovalPermissions', () => {
  it('reads the ERP global permission tree with no host configuration', () => {
    setErpPermissions({
      WorkflowAutomation: { canView: true, canEdit: true },
      [PERMISSION_KEYS.approvals]: { canView: true },
    });

    const { result } = renderHook(() => useApprovalPermissions());

    expect(result.current['workflow.view']).toBe(true);
    expect(result.current['workflow.edit']).toBe(true);
    expect(result.current['approval.view']).toBe(true);
    expect(result.current['applicable.grade']).toBe(false);
  });

  it('returns a stable object across renders so it is safe in a dependency array', () => {
    setErpPermissions({ Departments: { canView: true } });

    const { result, rerender } = renderHook(() => useApprovalPermissions());
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });

  it('is frozen, so a component cannot grant itself a capability', () => {
    setErpPermissions({});
    const { result } = renderHook(() => useApprovalPermissions());

    expect(Object.isFrozen(result.current)).toBe(true);
  });

  it('picks up a new tree after the signed-in role changes', () => {
    setErpPermissions({});
    const { result, rerender } = renderHook(() => useApprovalPermissions());
    expect(result.current['workflow.view']).toBe(false);

    setErpPermissions({ WorkflowAutomation: { canView: true } });
    rerender();

    expect(result.current['workflow.view']).toBe(true);
  });
});

describe('usePermission', () => {
  it('resolves a single capability', () => {
    setErpPermissions({ OrganisationStructure: { canView: true } });

    const { result } = renderHook(() => usePermission('workflow.approver.hierarchy'));
    expect(result.current).toBe(true);
  });

  it('denies a capability the tree does not grant', () => {
    setErpPermissions({});

    const { result } = renderHook(() => usePermission('workflow.delete'));
    expect(result.current).toBe(false);
  });
});
