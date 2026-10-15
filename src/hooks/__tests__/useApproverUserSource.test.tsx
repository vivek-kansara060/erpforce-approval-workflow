import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApproverUserSource } from '../useApproverUserSource';
import { setErpPermissions } from '../../test/stubs/erp-use-permissions';

const scope = { company_ids: [7] };

describe('useApproverUserSource', () => {
  it('reads the employee directory when the employee permission is granted', () => {
    setErpPermissions({ Employee: { canView: true } });

    const { result } = renderHook(() => useApproverUserSource(scope));

    expect(result.current).toEqual({
      apiType: 'employees',
      valueKey: 'user_id',
      attributes: ['user_id'],
      customeFilter: { '&user_id.ne': null, '&company_id.in': [7] },
    });
  });

  it('falls back to the users API when the employee permission is absent', () => {
    setErpPermissions({});

    const { result } = renderHook(() => useApproverUserSource(scope));

    expect(result.current.apiType).toBe('users');
    expect(result.current.customeFilter).toEqual({ '&company_id.in': [7] });
  });

  it('stores user ids either way, so a workflow opens correctly for both roles', () => {
    setErpPermissions({ Employee: { canView: true } });
    const { result: withEmployees } = renderHook(() => useApproverUserSource(scope));

    setErpPermissions({});
    const { result: withUsers } = renderHook(() => useApproverUserSource(scope));

    // The employee record is projected down to its `user_id`; a user record's
    // own id already is the user id, so no projection is needed.
    expect(withEmployees.current.valueKey).toBe('user_id');
    expect(withUsers.current.valueKey).toBeUndefined();
  });

  it('tolerates an unscoped workflow', () => {
    setErpPermissions({});

    const { result } = renderHook(() => useApproverUserSource({}));
    expect(result.current.customeFilter).toEqual({ '&company_id.in': [] });
  });

  it('keeps a stable object while the scope and permissions hold', () => {
    setErpPermissions({ Employee: { canView: true } });

    const { result, rerender } = renderHook(() => useApproverUserSource(scope));
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
