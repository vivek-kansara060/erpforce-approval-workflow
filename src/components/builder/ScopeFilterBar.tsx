import { useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { FilterAltOutlinedIcon as FilterIcon } from '../../ui/icons';
import { SearchableSelect, Typography } from '../../ui';
import { BORDER, SURFACE, TEXT_SUBTLE } from '../../ui/tokens';
import { DEFAULT_SCOPE_FILTERS } from '../../constants/options';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { selectApplicableFilters } from '../../permissions/derive-options';
import type { ScopeFilterDefinition } from '../../constants/options';
import type { WorkflowScope } from '../../types/workflow';

export interface ScopeFilterBarProps {
  scope: WorkflowScope;
  onChange: (key: keyof WorkflowScope, value: Array<string | number>) => void;
  /** Override the default company/location/department/grade/type filters. */
  filters?: ScopeFilterDefinition[];
  disabled?: boolean;
  label?: string;
  /**
   * Render only the filters that hold a selection. For a read-only summary: an
   * unused filter is noise, and each one mounted costs a lookup request.
   */
  onlySelected?: boolean;
}

/**
 * Each selector is borderless inside the bar — the bar itself is the container,
 * so five stacked outlines do not compete with the canvas behind it. A divider
 * between selectors keeps them separable.
 */
const selectStyle = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { border: 'none' },
    '&:hover fieldset': { border: 'none' },
    '&.Mui-focused fieldset': { border: 'none' },
  },
};

const inputStyle = {
  border: 'none',
  '& .MuiOutlinedInput-input': { padding: '0 !important', fontSize: 14 },
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
};

/**
 * Scope selectors shown above the canvas.
 *
 * Fully controlled: the form owns the values. The original read and wrote them
 * through `useFormContext` from inside the canvas, which coupled the builder to
 * react-hook-form and to one specific field-array name.
 *
 * Rendered in normal flow directly above the canvas. As an overlay it covered
 * whichever node sat near the top of the viewport — the trigger, most of the
 * time, since that is where auto-layout puts it.
 *
 * Filters whose master data the signed-in user cannot read are not rendered.
 * A hidden filter's existing value is left untouched on the workflow, so
 * opening and saving a workflow scoped by a department you cannot see does not
 * silently widen it.
 */
export const ScopeFilterBar = ({
  scope,
  onChange,
  filters = DEFAULT_SCOPE_FILTERS,
  disabled = false,
  label = 'Applicable filter',
  onlySelected = false,
}: ScopeFilterBarProps) => {
  const permissions = useApprovalPermissions();

  const visibleFilters = useMemo(() => {
    const applicable = selectApplicableFilters(filters, permissions);
    return onlySelected
      ? applicable.filter((filter) => (scope[filter.valueKey] ?? []).length > 0)
      : applicable;
  }, [filters, permissions, onlySelected, scope]);

  const handleChange = useCallback(
    (key: keyof WorkflowScope, value: Array<string | number>) => onChange(key, value ?? []),
    [onChange],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.5,
        px: 2,
        py: 0.75,
        bgcolor: SURFACE,
      }}
    >
      <Box display="flex" alignItems="center" gap={0.75} pr={1.5} flexShrink={0}>
        <FilterIcon fontSize="small" sx={{ color: TEXT_SUBTLE }} />
        <Typography type="s5" weight="medium" color={TEXT_SUBTLE}>
          {label}
        </Typography>
      </Box>

      {visibleFilters.map((filter, index) => {
        const sourceProps = filter.options
          ? { options: filter.options }
          : { apiType: filter.apiType };

        return (
          <Box
            key={filter.key}
            sx={{
              minWidth: 150,
              flex: '1 1 150px',
              ...(index > 0
                ? { borderLeft: '1px solid', borderColor: BORDER, pl: 0.5 }
                : null),
            }}
          >
            <SearchableSelect
              multiple
              size="small"
              placeholder={filter.label}
              value={scope[filter.valueKey] ?? []}
              onChange={(event: { target: { value: Array<string | number> } }) =>
                handleChange(filter.valueKey, event?.target?.value)
              }
              {...sourceProps}
              customStyle={selectStyle}
              inputStyle={inputStyle}
              showCancelButton={filter.showCancelButton}
              customeFilter={filter.dependentFilter?.(scope as never)}
              disabled={disabled}
            />
          </Box>
        );
      })}
    </Box>
  );
};
