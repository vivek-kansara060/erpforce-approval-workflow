import { describe, expect, it } from 'vitest';
import {
  conditionsToQuery,
  createEmptyQuery,
  filterOperatorsForField,
  isQueryComplete,
  isRuleComplete,
  normalizeFieldType,
  queryToConditions,
  resetRuleForConditionType,
} from '../condition-transform';
import type { ConditionQuery, CriteriaCondition, OperatorReference } from '../../types/criteria';

describe('conditionsToQuery / queryToConditions', () => {
  const conditions: CriteriaCondition[] = [
    {
      condition_type: 'operator',
      field: 'leave_requests.total_days',
      sub_module: 'leave_requests',
      operator: 'op_greater_than',
      value: 5,
      logical_operator: 'OR',
    },
    {
      condition_type: 'aggregate',
      field: 'leave_requests.amount',
      sub_module: 'leave_requests',
      operator: 'op_greater_than',
      value: 100,
      aggregate_function: 'sum',
      logical_operator: 'OR',
    },
  ];

  it('round-trips conditions without losing data', () => {
    const query = conditionsToQuery(conditions, 'OR');
    const result = queryToConditions(query);

    expect(result.logical_operator).toBe('OR');
    expect(result.conditions).toHaveLength(2);
    expect(result.conditions[0].field).toBe('leave_requests.total_days');
    expect(result.conditions[0].sub_module).toBe('leave_requests');
    expect(result.conditions[1].aggregate_function).toBe('sum');
  });

  it('derives the combinator from the first condition when not given', () => {
    expect(conditionsToQuery(conditions).combinator).toBe('or');
  });

  it('returns a single empty rule for no conditions', () => {
    const query = conditionsToQuery([]);
    expect(query.rules).toHaveLength(1);
    expect(query.combinator).toBe('and');
  });

  it('only persists aggregate_function for aggregate rules', () => {
    const query: ConditionQuery = {
      id: 'q',
      combinator: 'and',
      rules: [
        {
          id: 'r',
          field: 'a.b',
          operator: 'op_eq',
          value: 1,
          condition_type: 'operator',
          aggregate_function: 'sum',
        },
      ],
    };

    expect(queryToConditions(query).conditions[0].aggregate_function).toBeUndefined();
  });

  it('only persists expression for formula rules', () => {
    const query: ConditionQuery = {
      id: 'q',
      combinator: 'and',
      rules: [
        {
          id: 'r',
          field: '',
          operator: 'op_gt',
          value: 10,
          condition_type: 'formula',
          expression: 'a + b',
        },
      ],
    };

    expect(queryToConditions(query).conditions[0].expression).toBe('a + b');
  });
});

describe('rule completeness', () => {
  it('requires field and value for an operator rule', () => {
    expect(
      isRuleComplete({ id: '1', field: '', operator: 'op_eq', value: 1, condition_type: 'operator' }),
    ).toBe(false);

    expect(
      isRuleComplete({
        id: '1',
        field: 'a.b',
        operator: 'op_eq',
        value: 1,
        condition_type: 'operator',
      }),
    ).toBe(true);
  });

  it('additionally requires an aggregate function for aggregate rules', () => {
    expect(
      isRuleComplete({
        id: '1',
        field: 'a.b',
        operator: 'op_eq',
        value: 1,
        condition_type: 'aggregate',
      }),
    ).toBe(false);

    expect(
      isRuleComplete({
        id: '1',
        field: 'a.b',
        operator: 'op_eq',
        value: 1,
        condition_type: 'aggregate',
        aggregate_function: 'sum',
      }),
    ).toBe(true);
  });

  it('accepts a formula rule with only an expression', () => {
    expect(
      isRuleComplete({
        id: '1',
        field: '',
        operator: '',
        value: '',
        condition_type: 'formula',
        expression: 'a + b',
      }),
    ).toBe(true);
  });

  it('treats a brand-new query as incomplete', () => {
    expect(isQueryComplete(createEmptyQuery())).toBe(false);
  });
});

describe('resetRuleForConditionType', () => {
  it('clears operator, value and the type-specific fields', () => {
    const reset = resetRuleForConditionType(
      {
        id: '1',
        field: 'a.b',
        operator: 'op_eq',
        value: 7,
        condition_type: 'aggregate',
        aggregate_function: 'sum',
      },
      'formula',
    );

    expect(reset.operator).toBe('');
    expect(reset.value).toBe('');
    expect(reset.aggregate_function).toBeUndefined();
    expect(reset.expression).toBe('');
  });
});

describe('normalizeFieldType', () => {
  it('maps ERP types onto the operator vocabulary', () => {
    expect(normalizeFieldType('currency', false, false)).toBe('number');
    expect(normalizeFieldType('datetime', false, false)).toBe('date');
    expect(normalizeFieldType('text', false, false)).toBe('string');
  });

  it('treats enum and lookup fields as strings', () => {
    expect(normalizeFieldType('integer', true, false)).toBe('string');
    expect(normalizeFieldType('integer', false, true)).toBe('string');
  });

  it('returns undefined when no field is selected', () => {
    expect(normalizeFieldType(undefined, false, false)).toBeUndefined();
  });
});

describe('filterOperatorsForField', () => {
  const operators: OperatorReference[] = [
    { id: 1, value: 'op_gt', label: '>', metadata: { data_types: ['number', 'date'] } },
    { id: 2, value: 'op_contains', label: 'contains', metadata: { data_types: ['string'] } },
  ];

  it('narrows to the operators valid for the field type', () => {
    const result = filterOperatorsForField(operators, {
      label: 'Amount',
      value: 'a.amount',
      field_type: 'currency',
    });

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('op_gt');
  });

  it('falls back to every operator when the field type is unknown', () => {
    expect(filterOperatorsForField(operators, null)).toHaveLength(2);
  });

  it('falls back to every operator when nothing matches, rather than blocking the user', () => {
    const result = filterOperatorsForField(operators, {
      label: 'Flag',
      value: 'a.flag',
      field_type: 'boolean',
    });

    expect(result).toHaveLength(2);
  });
});
