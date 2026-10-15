import { useCallback, useMemo } from 'react';
import { DatePicker, SearchableSelect, TextField } from '../../../ui';
import { getFieldEnumValues, getFieldTable } from '../../../utils/condition-transform';
import { useApprovalWorkflowApi } from '../../../providers/useApprovalWorkflowConfig';
import type { ConditionRule, EntityFieldMeta } from '../../../types/criteria';

export interface ConditionValueInputProps {
  rule: ConditionRule;
  fieldMeta: EntityFieldMeta | null;
  onChange: (value: string | number) => void;
  placeholder: string;
  /** Placeholder for the enum and lookup variants, which pick rather than type. */
  selectPlaceholder?: string;
  disabled?: boolean;
}

const NUMERIC_FIELD_TYPES = ['number', 'integer', 'float', 'decimal', 'currency'];

/**
 * Renders the right input for the selected field.
 *
 * enum -> select, foreign key -> paginated lookup, date -> date picker,
 * everything else -> text or number. The lookup goes through the reference API
 * rather than a hand-rolled `fetch`, so it shares the package's transport,
 * auth headers and error normalisation.
 */
export const ConditionValueInput = ({
  rule,
  fieldMeta,
  onChange,
  placeholder,
  selectPlaceholder,
  disabled = false,
}: ConditionValueInputProps) => {
  const { reference } = useApprovalWorkflowApi();

  const enumValues = getFieldEnumValues(fieldMeta);
  const tableName = getFieldTable(fieldMeta);
  const fieldType = fieldMeta?.field_type;

  const enumOptions = useMemo(() => {
    if (!enumValues?.length) return null;
    return enumValues.map((entry) =>
      typeof entry === 'string'
        ? { id: entry, value: entry, label: entry }
        : { id: entry.name, value: entry.name, label: entry.label },
    );
  }, [enumValues]);

  const fetchEnumOptions = useCallback(
    async () => ({
      data: enumOptions ?? [],
      pagination: { totalCount: enumOptions?.length ?? 0 },
    }),
    [enumOptions],
  );

  const fetchTableOptions = useCallback(
    async (params: { search?: string; limit?: number; skip?: number }) => {
      const result = await reference.filterTable({
        table: tableName as string,
        search: params?.search ?? '',
        limit: params?.limit ?? 25,
        offset: params?.skip ?? 0,
      });
      return {
        data: result.items.map((item) => ({ id: item.value, value: item.value, label: item.label })),
        pagination: { totalCount: result.totalCount },
      };
    },
    [reference, tableName],
  );

  if (enumOptions) {
    return (
      <SearchableSelect
        value={rule.value ?? ''}
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        customFetchApi={fetchEnumOptions}
        placeholder={selectPlaceholder ?? placeholder}
        disabled={disabled}
      />
    );
  }

  if (tableName) {
    return (
      <SearchableSelect
        value={rule.value ?? ''}
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        customFetchApi={fetchTableOptions}
        placeholder={selectPlaceholder ?? placeholder}
        disabled={disabled}
      />
    );
  }

  if (fieldType === 'date' || fieldType === 'datetime') {
    return (
      <DatePicker
        value={rule.value ? new Date(String(rule.value)) : null}
        onChange={(value: Date | null) =>
          onChange(value && !Number.isNaN(value.getTime()) ? toIsoDate(value) : '')
        }
        format="DD-MM-YYYY"
        disabled={disabled}
        slotProps={{ textField: { placeholder: 'DD-MM-YYYY', size: 'small' } }}
      />
    );
  }

  const isNumeric =
    rule.condition_type === 'aggregate' ||
    (fieldType !== undefined && NUMERIC_FIELD_TYPES.includes(fieldType));

  return (
    <TextField
      size="small"
      value={rule.value ?? ''}
      onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
      type={isNumeric ? 'number' : 'text'}
      placeholder={placeholder}
      disabled={disabled}
      fullWidth
    />
  );
};

/**
 * `YYYY-MM-DD` in local time.
 *
 * `toISOString()` would shift the date across the UTC boundary for users east
 * or west of it, which silently moved criteria dates by a day.
 */
const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
