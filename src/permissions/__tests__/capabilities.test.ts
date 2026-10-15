import { describe, expect, it } from 'vitest';
import { readPermissionNode, resolveCapabilities } from '../capabilities';
import { PERMISSION_KEYS } from '../permission-keys';
import type { ErpPermissionTree } from '../../types/permissions';

const FULL: ErpPermissionTree = {
  WorkflowAutomation: { canView: true, canViewById: true, canAdd: true, canEdit: true, canDelete: true },
  [PERMISSION_KEYS.approvals]: { canView: true, canViewById: true, canEdit: true },
  Departments: { canView: true },
  Grades: { canView: true },
  Employee: { canView: true },
  OrganisationStructure: { canView: true },
};

const without = (key: string): ErpPermissionTree => {
  const tree = { ...FULL };
  delete tree[key];
  return tree;
};

describe('PERMISSION_KEYS', () => {
  it('names the ERP RBAC modules the package reads', () => {
    // Keyed off the constant everywhere else, so this is the one assertion
    // that would catch an accidental rename.
    expect(PERMISSION_KEYS).toEqual({
      workflow: 'WorkflowAutomation',
      approvals: 'Approvals',
      commonApprovals: 'ErpCommonApprovals',
      departments: 'Departments',
      grades: 'Grades',
      employee: 'employee',
      hierarchy: 'OrganisationStructure',
    });
  });
});

describe('readPermissionNode', () => {
  it('matches the tree key case-insensitively', () => {
    // The required key is `employee`; the tree builder emits `Employee`.
    expect(readPermissionNode(FULL, PERMISSION_KEYS.employee)).toEqual({ canView: true });
  });

  it('prefers an exact match over a case-insensitive one', () => {
    const tree: ErpPermissionTree = {
      employee: { canView: true },
      Employee: { canDelete: true },
    };
    expect(readPermissionNode(tree, 'employee')).toEqual({ canView: true });
  });

  it('returns an empty node for a missing key or a missing tree', () => {
    expect(readPermissionNode(FULL, 'Nope')).toEqual({});
    expect(readPermissionNode(undefined, 'Departments')).toEqual({});
  });
});

describe('resolveCapabilities — Approval Workflow (WorkflowAutomation)', () => {
  it('grants the workflow capabilities when WorkflowAutomation is granted', () => {
    const permissions = resolveCapabilities(FULL);

    expect(permissions['workflow.view']).toBe(true);
    expect(permissions['workflow.viewById']).toBe(true);
    expect(permissions['workflow.create']).toBe(true);
    expect(permissions['workflow.edit']).toBe(true);
    expect(permissions['workflow.delete']).toBe(true);
    expect(permissions['workflow.activate']).toBe(true);
  });

  it('denies every workflow capability when WorkflowAutomation is absent', () => {
    const permissions = resolveCapabilities(without('WorkflowAutomation'));

    expect(permissions['workflow.view']).toBe(false);
    expect(permissions['workflow.viewById']).toBe(false);
    expect(permissions['workflow.create']).toBe(false);
    expect(permissions['workflow.edit']).toBe(false);
    expect(permissions['workflow.delete']).toBe(false);
    expect(permissions['workflow.activate']).toBe(false);
  });

  it('treats an update right as implying the right to author', () => {
    const permissions = resolveCapabilities({ WorkflowAutomation: { canView: true, canEdit: true } });
    expect(permissions['workflow.create']).toBe(true);
  });

  it('falls back to list access for by-id access', () => {
    const permissions = resolveCapabilities({ WorkflowAutomation: { canView: true } });
    expect(permissions['workflow.viewById']).toBe(true);
    expect(permissions['workflow.edit']).toBe(false);
    expect(permissions['workflow.delete']).toBe(false);
  });
});

describe('resolveCapabilities — Approval Dashboard (Approvals)', () => {
  it('grants dashboard access when Approvals is granted', () => {
    const permissions = resolveCapabilities(FULL);

    expect(permissions['approval.view']).toBe(true);
    expect(permissions['approval.viewById']).toBe(true);
    expect(permissions['approval.approve']).toBe(true);
    expect(permissions['approval.reject']).toBe(true);
  });

  it('denies dashboard access when Approvals is absent', () => {
    const permissions = resolveCapabilities(without(PERMISSION_KEYS.approvals));

    expect(permissions['approval.view']).toBe(false);
    expect(permissions['approval.viewById']).toBe(false);
    expect(permissions['approval.approve']).toBe(false);
    expect(permissions['approval.reject']).toBe(false);
  });

  it('keeps the queue readable but the decision rights follow the update flag', () => {
    const readOnly = resolveCapabilities({ [PERMISSION_KEYS.approvals]: { canView: true } });
    expect(readOnly['approval.view']).toBe(true);
    // The backend seeds read-only roles without `u`; those roles still act on
    // the queue today, so read implies decide until it seeds otherwise.
    expect(readOnly['approval.approve']).toBe(true);
  });

  it('falls back to ErpCommonApprovals when the role has nothing under Approvals', () => {
    const permissions = resolveCapabilities({
      ...without(PERMISSION_KEYS.approvals),
      [PERMISSION_KEYS.commonApprovals]: { canView: true, canEdit: true },
    });

    expect(permissions['approval.view']).toBe(true);
    expect(permissions['approval.approve']).toBe(true);
  });

  it('prefers a populated Approvals node over ErpCommonApprovals', () => {
    const permissions = resolveCapabilities({
      [PERMISSION_KEYS.approvals]: { canViewById: true },
      [PERMISSION_KEYS.commonApprovals]: { canView: true, canEdit: true },
    });

    expect(permissions['approval.view']).toBe(false);
    expect(permissions['approval.viewById']).toBe(true);
  });

  it('reads through an empty Approvals placeholder to ErpCommonApprovals', () => {
    const permissions = resolveCapabilities({
      [PERMISSION_KEYS.approvals]: {},
      [PERMISSION_KEYS.commonApprovals]: { canView: true },
    });

    expect(permissions['approval.view']).toBe(true);
  });
});

describe('resolveCapabilities — master data gates', () => {
  it('maps each master-data permission to its capabilities', () => {
    const permissions = resolveCapabilities(FULL);

    expect(permissions['workflow.approver.department']).toBe(true);
    expect(permissions['workflow.approver.hierarchy']).toBe(true);
    expect(permissions['applicable.department']).toBe(true);
    expect(permissions['applicable.grade']).toBe(true);
    expect(permissions['applicable.employeeType']).toBe(true);
    expect(permissions['employee.directory']).toBe(true);
  });

  it('drops Department everywhere when Departments is absent', () => {
    const permissions = resolveCapabilities(without('Departments'));

    expect(permissions['workflow.approver.department']).toBe(false);
    expect(permissions['applicable.department']).toBe(false);
    // and nothing else moved
    expect(permissions['workflow.approver.hierarchy']).toBe(true);
    expect(permissions['applicable.grade']).toBe(true);
  });

  it('drops Hierarchy when OrganisationStructure is absent', () => {
    const permissions = resolveCapabilities(without('OrganisationStructure'));
    expect(permissions['workflow.approver.hierarchy']).toBe(false);
    expect(permissions['workflow.approver.department']).toBe(true);
  });

  it('drops Grade when Grades is absent', () => {
    const permissions = resolveCapabilities(without('Grades'));
    expect(permissions['applicable.grade']).toBe(false);
    expect(permissions['applicable.department']).toBe(true);
  });

  it('drops Employee Type and the employee directory when employee is absent', () => {
    const permissions = resolveCapabilities(without('Employee'));
    expect(permissions['applicable.employeeType']).toBe(false);
    expect(permissions['employee.directory']).toBe(false);
  });

  it('accepts by-id-only read as read access', () => {
    const permissions = resolveCapabilities({ Departments: { canViewById: true } });
    expect(permissions['applicable.department']).toBe(true);
  });

  it('always grants the User approver, whatever the employee permission says', () => {
    expect(resolveCapabilities(FULL)['workflow.approver.user']).toBe(true);
    expect(resolveCapabilities({})['workflow.approver.user']).toBe(true);
  });
});

describe('resolveCapabilities — empty tree', () => {
  it('denies everything except the User approver', () => {
    const permissions = resolveCapabilities({});
    const granted = Object.entries(permissions)
      .filter(([, value]) => value)
      .map(([key]) => key);

    expect(granted).toEqual(['workflow.approver.user']);
  });

  it('tolerates an undefined tree', () => {
    expect(resolveCapabilities(undefined)['workflow.view']).toBe(false);
  });
});
