import { toDottedField } from './graph-transform';
import type {
  ConditionQuery,
  ConditionRule,
  ConditionType,
  CriteriaCondition,
  EntityFieldMeta,
  LogicalOperator,
  OperatorReference,
} from '../types/criteria';

const uuid = (): string =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `rule-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export const createEmptyRule = (): ConditionRule => ({
  id: uuid(),
  field: '',
  operator: '',
  value: '',
  condition_type: 'operator',
});

export const createEmptyQuery = (): ConditionQuery => ({
  id: uuid(),
  combinator: 'and',
  rules: [createEmptyRule()],
});

/** Persisted conditions -> editable query. */
export const conditionsToQuery = (
  conditions: CriteriaCondition[] | undefined,
  logicalOperator?: string,
): ConditionQuery => {
  if (!conditions?.length) return createEmptyQuery();

  return {
    id: uuid(),
    combinator: (logicalOperator ?? conditions[0]?.logical_operator ?? 'AND').toLowerCase(),
    rules: conditions.map((condition) => {
      const rule: ConditionRule = {
        id: uuid(),
        field: toDottedField(condition),
        operator: condition.operator,
        value: condition.value,
        condition_type: condition.condition_type ?? 'operator',
        sub_module: condition.sub_module,
      };

      if (condition.aggregate_function !== undefined) {
        rule.aggregate_function = condition.aggregate_function;
      }
      if (condition.expression !== undefined) {
        rule.expression = condition.expression;
      }

      return rule;
    }),
  };
};

/** Editable query -> persisted conditions. */
export const queryToConditions = (
  query: ConditionQuery,
): { conditions: CriteriaCondition[]; logical_operator: LogicalOperator } => {
  const logical_operator = query.combinator.toUpperCase() as LogicalOperator;

  const conditions = query.rules.map((rule): CriteriaCondition => {
    const dotIndex = rule.field.indexOf('.');
    const sub_module = dotIndex !== -1 ? rule.field.slice(0, dotIndex) : '';

    const condition: CriteriaCondition = {
      sub_module,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      condition_type: rule.condition_type,
      logical_operator,
    };

    if (rule.condition_type === 'aggregate') condition.aggregate_function = rule.aggregate_function;
    if (rule.condition_type === 'formula') condition.expression = rule.expression;

    return condition;
  });

  return { conditions, logical_operator };
};

/** A rule is complete enough to save. */
export const isRuleComplete = (rule: ConditionRule): boolean => {
  const hasValue = rule.value !== undefined && rule.value !== '';
  if (rule.condition_type === 'formula') return Boolean(rule.expression?.trim()) || hasValue;

  const hasField = Boolean(rule.field);
  if (rule.condition_type === 'aggregate') {
    return hasValue && hasField && Boolean(rule.aggregate_function);
  }
  return hasValue && hasField;
};

export const isQueryComplete = (query: ConditionQuery): boolean =>
  query.rules.length > 0 && query.rules.every(isRuleComplete);

/** Resets the dependent parts of a rule when its condition type changes. */
export const resetRuleForConditionType = (
  rule: ConditionRule,
  conditionType: ConditionType,
): ConditionRule => ({
  ...rule,
  condition_type: conditionType,
  operator: '',
  value: '',
  field: '',
  aggregate_function: conditionType === 'aggregate' ? '' : undefined,
  expression: conditionType === 'formula' ? '' : undefined,
});

/** Maps ERP field types onto the `data_types` vocabulary the operator API uses. */
const FIELD_TYPE_TO_DATA_TYPE: Record<string, string> = {
  string: 'string',
  text: 'string',
  enum: 'string',
  select: 'string',
  number: 'number',
  integer: 'number',
  float: 'number',
  decimal: 'number',
  currency: 'number',
  date: 'date',
  datetime: 'date',
  boolean: 'boolean',
  array: 'array',
};

export const normalizeFieldType = (
  fieldType: string | undefined,
  hasEnum: boolean,
  hasTable: boolean,
): string | undefined => {
  // Enum and FK-lookup fields are compared as strings regardless of storage type.
  if (hasEnum || hasTable) return 'string';
  if (!fieldType) return undefined;
  return FIELD_TYPE_TO_DATA_TYPE[fieldType] ?? fieldType;
};

export const getFieldEnumValues = (meta: EntityFieldMeta | null | undefined) =>
  meta?.enum ?? meta?.metadata?.values ?? meta?.values;

export const getFieldTable = (meta: EntityFieldMeta | null | undefined) =>
  meta?.table ?? meta?.metadata?.table;

/**
 * Narrows the operator list to those valid for the selected field's type.
 * Falls back to the full list when the field type is unknown or nothing matches,
 * so a missing `data_types` annotation never blocks the user.
 */
export const filterOperatorsForField = (
  operators: OperatorReference[],
  meta: EntityFieldMeta | null | undefined,
): OperatorReference[] => {
  if (!operators.length) return [];

  const enumValues = getFieldEnumValues(meta);
  const normalized = normalizeFieldType(
    meta?.field_type,
    Boolean(enumValues?.length),
    Boolean(getFieldTable(meta)),
  );

  if (!normalized) return operators;

  const matching = operators.filter((operator) =>
    (operator.metadata?.data_types ?? []).includes(normalized),
  );

  return matching.length > 0 ? matching : operators;
};
