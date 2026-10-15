import { memo, useMemo } from 'react';
import { SearchableSelect, Typography } from '../../../ui';
import { TEXT_SUBTLE } from '../../../ui/tokens';
import { FormField } from '../../layout';
import { NumberedCard } from './NumberedCard';
import { ConditionValueInput } from './ConditionValueInput';
import { FormulaEditor } from './FormulaEditor';
import { I18N } from '../../../constants/i18n-keys';
import { CONDITION_TYPE_OPTIONS } from '../../../constants/options';
import { filterOperatorsForField } from '../../../utils/condition-transform';
import { findGroupedOption, flattenFieldGroups } from '../../../utils/option-source';
import { useTranslate } from '../../../providers/useApprovalWorkflowConfig';
import type { SelectOption, SelectOptionGroup } from '../../../types/common';
import type { ConditionRule, ConditionType, OperatorReference } from '../../../types/criteria';

export interface CriteriaConditionRowProps {
  rule: ConditionRule;
  /** Position in the rule list; drives the card heading and every callback. */
  index: number;
  /** Selectable entity fields, already loaded. */
  fieldGroups: Array<SelectOptionGroup<string>>;
  operators: OperatorReference[];
  aggregateFunctions: SelectOption[];
  onChange: (index: number, patch: Partial<ConditionRule>) => void;
  onFieldChange: (index: number, field: string) => void;
  onConditionTypeChange: (index: number, conditionType: ConditionType) => void;
  onRemove: (index: number) => void;
  /** False for the last remaining rule, which cannot be removed. */
  canRemove: boolean;
}

/**
 * One numbered condition card in the criteria drawer.
 *
 * A component rather than a block inside the drawer's `map` so each row owns its
 * own `useGroupedOptionSource`. One shared instance across every row is what
 * that hook's accumulator was explicitly built to avoid: the rows take turns
 * resetting each other's search term and paging state, so scrolling the field
 * picker on the second condition dropped the first page of results on the first.
 */
const CriteriaConditionRowComponent = ({
  rule,
  index,
  fieldGroups,
  operators,
  aggregateFunctions,
  onChange,
  onFieldChange,
  onConditionTypeChange,
  onRemove,
  canRemove,
}: CriteriaConditionRowProps) => {
  const t = useTranslate();

  // Flat `options`, not `customFetchApi`: the select only resolves a value's label
  // from options it already holds, and a fetch source is not called until the
  // dropdown opens, so a saved field rendered a clear button but no label.
  const fieldOptions = useMemo(() => flattenFieldGroups(fieldGroups), [fieldGroups]);

  const fieldMeta = useMemo(
    () => findGroupedOption(fieldGroups, rule.field),
    [fieldGroups, rule.field],
  );

  const applicableOperators = useMemo(
    () => filterOperatorsForField(operators, fieldMeta),
    [operators, fieldMeta],
  );

  const conditionType = rule.condition_type;

  return (
    <NumberedCard
      heading={
        <Typography type="s5" weight="medium" color={TEXT_SUBTLE}>
          {`${t(I18N.sidebar.condition)} ${index + 1}`}
        </Typography>
      }
      onRemove={canRemove ? () => onRemove(index) : undefined}
      removeLabel={`${t(I18N.common.delete)} ${t(I18N.sidebar.condition)} ${index + 1}`}
      bodyGap={1.5}
    >
      <FormField label={t(I18N.sidebar.conditionTypeLabel)}>
        <SearchableSelect
          options={CONDITION_TYPE_OPTIONS}
          size="small"
          value={conditionType}
          onChange={(event: { target: { value: ConditionType } }) =>
            onConditionTypeChange(index, event.target.value)
          }
          placeholder={t(I18N.sidebar.conditionType)}
        />
      </FormField>

      {conditionType === 'formula' ? (
        <FormField label={t(I18N.sidebar.expressionLabel)}>
          <FormulaEditor
            value={rule.expression ?? ''}
            fields={fieldGroups}
            onChange={(expression: string) => onChange(index, { expression })}
            placeholder={t(I18N.sidebar.expressionPlaceholder)}
            fieldPlaceholder={t(I18N.sidebar.field)}
          />
        </FormField>
      ) : (
        <FormField label={t(I18N.sidebar.fieldLabel)}>
          <SearchableSelect
            value={rule.field}
            size="small"
            options={fieldOptions}
            onChange={(event: { target: { value: string } }) =>
              onFieldChange(index, event.target.value)
            }
            placeholder={t(I18N.sidebar.field)}
          />
        </FormField>
      )}

      {conditionType === 'aggregate' ? (
        <FormField label={t(I18N.sidebar.aggregateFunctionLabel)}>
          <SearchableSelect
            options={aggregateFunctions}
            size="small"
            value={rule.aggregate_function ?? ''}
            onChange={(event: { target: { value: string } }) =>
              onChange(index, { aggregate_function: event.target.value })
            }
            placeholder={t(I18N.sidebar.aggregateFunction)}
          />
        </FormField>
      ) : null}

      <FormField label={t(I18N.sidebar.operatorLabel)}>
        <SearchableSelect
          options={applicableOperators}
          size="small"
          value={rule.operator}
          onChange={(event: { target: { value: string } }) =>
            onChange(index, { operator: event.target.value })
          }
          placeholder={t(I18N.sidebar.operator)}
        />
      </FormField>

      <FormField label={t(I18N.sidebar.valueLabel)}>
        <ConditionValueInput
          // Remount on a field change: the value editor switches between a text
          // box, an enum select and a lookup depending on the field's type.
          key={rule.field}
          rule={rule}
          fieldMeta={fieldMeta}
          onChange={(value: string | number) => onChange(index, { value })}
          placeholder={t(I18N.sidebar.value)}
          selectPlaceholder={t(I18N.sidebar.valueSelect)}
        />
      </FormField>
    </NumberedCard>
  );
};

export const CriteriaConditionRow = memo(CriteriaConditionRowComponent);
CriteriaConditionRow.displayName = 'CriteriaConditionRow';
