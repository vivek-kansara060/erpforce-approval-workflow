/**
 * The single mapping from ERP RBAC keys to package capabilities.
 *
 * Pure on purpose: no React, no context, no hook. The whole permission model is
 * one function of one object, which makes every rule in the matrix testable
 * without rendering anything.
 */

import { PERMISSION_KEYS } from './permission-keys';
import type {
  ApprovalWorkflowPermissions,
  ErpPermissionNode,
  ErpPermissionTree,
} from '../types/permissions';

const EMPTY_NODE: ErpPermissionNode = {};

/**
 * Looks a module up in the permission tree.
 *
 * Exact key first. The tree builder in @erpsquad/common derives its keys from
 * the backend payload and capitalises them (`employee` arrives as `Employee`),
 * so a case-insensitive second pass keeps the required key names usable as
 * written without inventing a second constant for the same permission.
 */
export const readPermissionNode = (
  tree: ErpPermissionTree | undefined,
  key: string,
): ErpPermissionNode => {
  if (!tree) return EMPTY_NODE;

  const direct = tree[key];
  if (direct) return direct;

  const needle = key.toLowerCase();
  for (const treeKey of Object.keys(tree)) {
    if (treeKey.toLowerCase() === needle) return tree[treeKey] ?? EMPTY_NODE;
  }

  return EMPTY_NODE;
};

/**
 * The dashboard's RBAC node: `Approvals`, or `ErpCommonApprovals` for roles
 * seeded under the shared ERP-wide resource instead. The first one that
 * carries any flag wins, so an empty `Approvals` placeholder does not hide a
 * populated `ErpCommonApprovals`.
 */
const readApprovalsNode = (tree: ErpPermissionTree | undefined): ErpPermissionNode => {
  const primary = readPermissionNode(tree, PERMISSION_KEYS.approvals);
  return Object.keys(primary).length > 0
    ? primary
    : readPermissionNode(tree, PERMISSION_KEYS.commonApprovals);
};

/**
 * "May this user read the resource at all?"
 *
 * List access and by-id access are both reads; a role granted only the detail
 * endpoint still knows the resource exists and can pick from it.
 */
const canRead = (node: ErpPermissionNode): boolean =>
  Boolean(node.canView || node.canViewById);

/**
 * Resolves the full capability set from one ERP permission tree.
 *
 * Every capability is derived here and nowhere else, so the permission matrix
 * in the docs is a transcription of this function rather than a parallel
 * description of scattered checks.
 */
export const resolveCapabilities = (
  tree: ErpPermissionTree | undefined,
): ApprovalWorkflowPermissions => {
  const workflow = readPermissionNode(tree, PERMISSION_KEYS.workflow);
  const approvals = readApprovalsNode(tree);

  const canReadDepartments = canRead(readPermissionNode(tree, PERMISSION_KEYS.departments));
  const canReadGrades = canRead(readPermissionNode(tree, PERMISSION_KEYS.grades));
  const canReadEmployees = canRead(readPermissionNode(tree, PERMISSION_KEYS.employee));
  const canReadHierarchy = canRead(readPermissionNode(tree, PERMISSION_KEYS.hierarchy));

  return Object.freeze({
    'workflow.view': Boolean(workflow.canView),
    'workflow.viewById': Boolean(workflow.canViewById || workflow.canView),

    /**
     * `canAdd` first, then `canEdit`.
     *
     * The backend only seeds the flags a role was actually granted, so a
     * missing `canAdd` means "not expressed" rather than "denied". Roles that
     * were seeded update-only would otherwise lose the workflow list's only
     * primary action; an update right on workflow definitions implies the
     * right to author one.
     */
    'workflow.create': Boolean(workflow.canAdd || workflow.canEdit),
    'workflow.edit': Boolean(workflow.canEdit),
    'workflow.delete': Boolean(workflow.canDelete),
    'workflow.activate': Boolean(workflow.canEdit),

    /**
     * User is always offered. It is the one approver strategy with no master
     * data behind it — `employee` decides which directory it reads, not
     * whether it is available. See `useApproverUserSource`.
     */
    'workflow.approver.user': true,
    'workflow.approver.department': canReadDepartments,
    'workflow.approver.hierarchy': canReadHierarchy,

    'approval.view': Boolean(approvals.canView),
    'approval.viewById': Boolean(approvals.canViewById || approvals.canView),
    // Deciding is an update on the request; roles seeded read-only on the
    // dashboard keep the queue visible with the decision buttons disabled.
    'approval.approve': Boolean(approvals.canEdit || approvals.canView),
    'approval.reject': Boolean(approvals.canEdit || approvals.canView),

    'applicable.department': canReadDepartments,
    'applicable.grade': canReadGrades,
    // Employee Type is a static two-option list, so this is a pure visibility
    // rule — it never triggers a lookup just to decide whether to render.
    'applicable.employeeType': canReadEmployees,

    'employee.directory': canReadEmployees,
  });
};
