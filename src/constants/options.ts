import type { SelectOption } from '../types/common';
import type { ApproverType, AutoApproveUnit } from '../types/approver';
import type { ConditionType } from '../types/criteria';
import type { ApprovalWorkflowCapability } from '../types/permissions';

/** Approver strategies supported by the builder. */
export const APPROVER_TYPE_OPTIONS: Array<SelectOption<ApproverType>> = [
  { id: 'DEPARTMENT', value: 'DEPARTMENT', label: 'Department' },
  { id: 'HIERARCHY', value: 'HIERARCHY', label: 'Hierarchy' },
  { id: 'USER', value: 'USER', label: 'User' },
];

/**
 * The permission behind each approver strategy.
 *
 * Explicit and exhaustive so adding a strategy cannot silently ship without a
 * gate. `USER` maps to a capability that is always granted — see
 * `resolveCapabilities`.
 */
export const CAPABILITY_BY_APPROVER_TYPE: Readonly<
  Record<ApproverType, ApprovalWorkflowCapability>
> = {
  USER: 'workflow.approver.user',
  DEPARTMENT: 'workflow.approver.department',
  HIERARCHY: 'workflow.approver.hierarchy',
};

/** Auto-approve delay magnitude (1..5), matching the original behaviour. */
export const AUTO_APPROVE_VALUE_OPTIONS: Array<SelectOption<number>> = Array.from(
  { length: 5 },
  (_, index) => ({ value: index + 1, label: String(index + 1) }),
);

export const AUTO_APPROVE_UNIT_OPTIONS: Array<SelectOption<Lowercase<AutoApproveUnit>>> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export const CONDITION_TYPE_OPTIONS: Array<SelectOption<ConditionType>> = [
  { value: 'operator', label: 'Operator' },
  { value: 'aggregate', label: 'Aggregator' },
  { value: 'formula', label: 'Formula' },
];

/** Static fallback used only when the operator reference API is unreachable. */
export const FALLBACK_OPERATOR_OPTIONS: SelectOption[] = [
  { value: 'op_equals', label: 'Equal To (=)' },
  { value: 'op_not_equals', label: 'Not Equal To (≠)' },
  { value: 'op_greater_than', label: 'Greater Than (>)' },
  { value: 'op_less_than', label: 'Less Than (<)' },
  { value: 'op_greater_than_or_equals', label: 'Greater Than or Equal (≥)' },
  { value: 'op_less_than_or_equals', label: 'Less Than or Equal (≤)' },
  { value: 'op_contains', label: 'Contains' },
  { value: 'op_not_contains', label: 'Does Not Contain' },
];

export const FALLBACK_LOGICAL_OPERATOR_OPTIONS: SelectOption[] = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
];

export const FALLBACK_AGGREGATE_FUNCTION_OPTIONS: SelectOption[] = [
  { value: 'avg', label: 'Average (AVG)' },
  { value: 'sum', label: 'Sum (SUM)' },
  { value: 'count', label: 'Count (COUNT)' },
  { value: 'min', label: 'Minimum (MIN)' },
  { value: 'max', label: 'Maximum (MAX)' },
];

/** Tokens the formula editor can insert. */
export const ARITHMETIC_OPERATORS = ['+', '-', '*', '/', '(', ')'] as const;

/**
 * Scope filters rendered above the builder canvas — the "Applicable" bar.
 *
 * `apiType` is forwarded to the ERP `SearchableSelect`, which owns the lookup.
 * A host can replace this list entirely through `WorkflowBuilder`'s
 * `scopeFilters` prop — nothing here is HRMS-specific by contract, only by
 * default value.
 *
 * `capability` names the master data a filter selects from. `ScopeFilterBar`
 * drops any filter whose capability the signed-in user lacks, so a role with
 * no access to the grade master never sees a Grade selector it could not
 * populate. A filter without a capability is always shown.
 */
export interface ScopeFilterDefinition {
  key: string;
  label: string;
  /** Field on the workflow the selection is written to. */
  valueKey:
    | 'company_ids'
    | 'location_ids'
    | 'department_ids'
    | 'grade_ids'
    | 'employment_type_ids';
  apiType?: string;
  options?: SelectOption[];
  showCancelButton?: boolean;
  /** Permission that must be granted for this filter to render at all. */
  capability?: ApprovalWorkflowCapability;
  /** Cascading filter derived from the currently selected scope. */
  dependentFilter?: (
    scope: Record<string, Array<string | number>>,
  ) => Record<string, unknown> | undefined;
}

export const DEFAULT_SCOPE_FILTERS: ScopeFilterDefinition[] = [
  {
    key: 'company',
    label: 'Company',
    apiType: 'company',
    valueKey: 'company_ids',
    showCancelButton: false,
  },
  {
    key: 'location',
    label: 'Location',
    apiType: 'location',
    valueKey: 'location_ids',
    dependentFilter: (scope) => ({ '&company_id.in': scope.company_ids }),
  },
  {
    key: 'department',
    label: 'Department',
    apiType: 'department',
    valueKey: 'department_ids',
    capability: 'applicable.department',
  },
  {
    key: 'grade',
    label: 'Grade',
    apiType: 'grades',
    valueKey: 'grade_ids',
    capability: 'applicable.grade',
  },
  {
    // Static options, but still gated: the two values describe employees, and
    // a role with no employee access has no business scoping a workflow by
    // them. Deliberately no lookup — visibility is decided by permission alone.
    key: 'employment_type',
    label: 'Employee Type',
    valueKey: 'employment_type_ids',
    capability: 'applicable.employeeType',
    options: [
      { label: 'Limited', value: 'limited' },
      { label: 'Unlimited', value: 'unlimited' },
    ],
  },
];
