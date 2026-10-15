/** Criteria / condition model used by criteria nodes. */

export type ConditionType = 'operator' | 'aggregate' | 'formula';

export type LogicalOperator = 'AND' | 'OR';

export interface CriteriaCondition {
  condition_type: ConditionType;

  /** Dotted path `${sub_module}.${field}` while editing; bare field on the wire. */
  field?: string;
  /** Entity the field belongs to, derived from the dotted field path. */
  sub_module?: string;

  operator: string;
  value: string | number;
  logical_operator?: LogicalOperator;

  entity_type?: string;
  module?: string;

  /** Only for `condition_type === 'aggregate'`. */
  aggregate_function?: string;
  /** Only for `condition_type === 'formula'`. */
  expression?: string;
}

/**
 * Editing shape for a single condition row. Mirrors react-querybuilder's rule
 * so the builder can be swapped for RQB without touching the wire format.
 */
export interface ConditionRule {
  id: string;
  field: string;
  operator: string;
  value: string | number;
  condition_type: ConditionType;
  sub_module?: string;
  aggregate_function?: string;
  expression?: string;
}

export interface ConditionQuery {
  id: string;
  combinator: string;
  rules: ConditionRule[];
}

/** Metadata the API returns for a selectable entity field. */
export interface EntityFieldMeta {
  label: string;
  value: string;
  field_type?: string;
  sub_module?: string;
  /** Enum values, either `string[]` or `{ name, label }[]` depending on source. */
  enum?: string[];
  values?: Array<{ name: string; label: string }>;
  /** Lookup table name for FK fields, resolved through the filter-table API. */
  table?: string;
  metadata?: {
    values?: Array<{ name: string; label: string }>;
    table?: string;
  };
}

/** Operator reference returned by `/v1/workflow-references/operator`. */
export interface OperatorReference {
  id: string | number;
  value: string | number;
  label: string;
  metadata?: {
    /** Data types this operator can be applied to. */
    data_types?: string[];
  };
}
