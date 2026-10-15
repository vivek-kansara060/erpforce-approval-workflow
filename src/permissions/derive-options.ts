/**
 * Capability → UI options.
 *
 * The middle layer of `permission → feature capability → UI behaviour`. Both
 * functions are pure and shared, so the Approval Type dropdown and the
 * Applicable bar cannot drift apart from the permission matrix, and neither
 * component carries a permission check of its own.
 *
 * Both *remove* entries rather than disabling them: an option the user may not
 * use is not a locked door they should see, it is master data they have no
 * access to at all.
 */

import { APPROVER_TYPE_OPTIONS, CAPABILITY_BY_APPROVER_TYPE } from '../constants/options';
import type { ScopeFilterDefinition } from '../constants/options';
import type { SelectOption } from '../types/common';
import type { ApproverType } from '../types/approver';
import type { ApprovalWorkflowPermissions } from '../types/permissions';

/**
 * The Approval Type options the signed-in user may configure.
 *
 * `User` is always present; `Department` and `Hierarchy` appear only with
 * `Departments` and `OrganisationStructure` respectively.
 */
export const selectApproverTypeOptions = (
  permissions: ApprovalWorkflowPermissions,
  options: Array<SelectOption<ApproverType>> = APPROVER_TYPE_OPTIONS,
): Array<SelectOption<ApproverType>> =>
  options.filter((option) => permissions[CAPABILITY_BY_APPROVER_TYPE[option.value]]);

/** The Applicable filters the signed-in user may scope a workflow by. */
export const selectApplicableFilters = (
  filters: ScopeFilterDefinition[],
  permissions: ApprovalWorkflowPermissions,
): ScopeFilterDefinition[] =>
  filters.filter((filter) => !filter.capability || permissions[filter.capability]);
