import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '../capabilities';
import { selectApplicableFilters, selectApproverTypeOptions } from '../derive-options';
import { DEFAULT_SCOPE_FILTERS } from '../../constants/options';
import type { ErpPermissionTree } from '../../types/permissions';

const permissionsFor = (tree: ErpPermissionTree) => resolveCapabilities(tree);

const ALL: ErpPermissionTree = {
  Departments: { canView: true },
  Grades: { canView: true },
  Employee: { canView: true },
  OrganisationStructure: { canView: true },
};

const without = (key: string): ErpPermissionTree => {
  const tree = { ...ALL };
  delete tree[key];
  return tree;
};

const approverTypes = (tree: ErpPermissionTree) =>
  selectApproverTypeOptions(permissionsFor(tree)).map((option) => option.value);

const applicableKeys = (tree: ErpPermissionTree) =>
  selectApplicableFilters(DEFAULT_SCOPE_FILTERS, permissionsFor(tree)).map(
    (filter) => filter.key,
  );

describe('Approval Type options', () => {
  it('offers every strategy with all permissions', () => {
    expect(approverTypes(ALL)).toEqual(['DEPARTMENT', 'HIERARCHY', 'USER']);
  });

  it('hides Department without Departments', () => {
    expect(approverTypes(without('Departments'))).toEqual(['HIERARCHY', 'USER']);
  });

  it('hides Hierarchy without OrganisationStructure', () => {
    expect(approverTypes(without('OrganisationStructure'))).toEqual(['DEPARTMENT', 'USER']);
  });

  it('leaves only User when both master-data permissions are missing', () => {
    expect(approverTypes({})).toEqual(['USER']);
  });

  it('keeps User even without the employee permission', () => {
    expect(approverTypes(without('Employee'))).toContain('USER');
  });
});

describe('Applicable filters', () => {
  it('shows Department, Grade and Employee Type with all permissions', () => {
    expect(applicableKeys(ALL)).toEqual([
      'company',
      'location',
      'department',
      'grade',
      'employment_type',
    ]);
  });

  it('hides Department without Departments', () => {
    expect(applicableKeys(without('Departments'))).not.toContain('department');
    expect(applicableKeys(without('Departments'))).toContain('grade');
  });

  it('hides Grade without Grades', () => {
    expect(applicableKeys(without('Grades'))).not.toContain('grade');
    expect(applicableKeys(without('Grades'))).toContain('department');
  });

  it('hides Employee Type without employee, and asks no API to decide it', () => {
    const keys = applicableKeys(without('Employee'));
    expect(keys).not.toContain('employment_type');
    // The gated filter is the static one — no lookup is configured for it.
    const employmentType = DEFAULT_SCOPE_FILTERS.find((f) => f.key === 'employment_type');
    expect(employmentType?.apiType).toBeUndefined();
    expect(employmentType?.options).toHaveLength(2);
  });

  it('never hides the ungated company and location filters', () => {
    expect(applicableKeys({})).toEqual(['company', 'location']);
  });

  it('passes through host-supplied filters that declare no capability', () => {
    const custom = [{ key: 'custom', label: 'Custom', valueKey: 'grade_ids' as const }];
    expect(selectApplicableFilters(custom, permissionsFor({}))).toEqual(custom);
  });
});
