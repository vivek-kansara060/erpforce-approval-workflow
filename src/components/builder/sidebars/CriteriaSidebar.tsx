import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { AddIcon } from '../../../ui/icons';
import { Button, CriteriaIcon, SearchableSelect, TextField, Typography } from '../../../ui';
import { BORDER, TEXT_STRONG, outlinedBorderSx } from '../../../ui/tokens';
import { ErrorState, LoadingState } from '../../feedback';
import { FormField } from '../../layout';
import { SidebarShell } from './SidebarShell';
import { CriteriaConditionRow } from './CriteriaConditionRow';
import { I18N } from '../../../constants/i18n-keys';
import {
  conditionsToQuery,
  createEmptyQuery,
  createEmptyRule,
  isQueryComplete,
  queryToConditions,
  resetRuleForConditionType,
} from '../../../utils/condition-transform';
import { useTranslate } from '../../../providers/useApprovalWorkflowConfig';
import {
  useEntityFields,
  useOperators,
  useReferenceOptions,
} from '../../../hooks/useWorkflowReferences';
import type { ConditionQuery, ConditionRule, ConditionType } from '../../../types/criteria';
import type { CriteriaNodeData } from '../../../types/graph';

export interface CriteriaSidebarProps {
  isOpen: boolean;
  nodeId: string | null;
  parentNodeId: string | null;
  nodeData: CriteriaNodeData | null;
  onClose: () => void;
  onSave: (nodeId: string, data: CriteriaNodeData, parentNodeId: string) => void;
  /** Entity whose fields are selectable in conditions. */
  entityType: string;
  /** Show the saved conditions without editing: no save, add or remove. */
  readOnly?: boolean;
}

/**
 * Builds the condition set for a criteria node.
 *
 * Reference data (operators, aggregate functions, logical operators, entity
 * fields) is fetched through the shared cache and only while the drawer is
 * open, so re-opening it costs nothing.
 *
 * Each rule is a numbered card and the AND/OR joiner sits on the rule that
 * follows it, centred on a hairline — the shape readers already know from
 * every query builder.
 */
export const CriteriaSidebar = ({
  isOpen,
  nodeId,
  parentNodeId,
  nodeData,
  onClose,
  onSave,
  entityType,
  readOnly = false,
}: CriteriaSidebarProps) => {
  const t = useTranslate();

  const [title, setTitle] = useState('');
  const [query, setQuery] = useState<ConditionQuery>(createEmptyQuery);

  const {
    groups: entityFieldGroups,
    isLoading: isFieldCatalogueLoading,
    error: fieldCatalogueError,
    refetch: refetchFieldCatalogue,
  } = useEntityFields(isOpen ? entityType : undefined);
  const { operators } = useOperators({ enabled: isOpen });
  const { options: aggregateFunctions } = useReferenceOptions('aggregate_function', {
    enabled: isOpen,
  });
  const { options: logicalOperators } = useReferenceOptions('logical_operator', {
    enabled: isOpen,
  });

  // Hydrate from the node, and reset fully on close so the next open starts clean.
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setQuery(createEmptyQuery());
      return;
    }
    setTitle(nodeData?.label ?? '');
    setQuery(
      nodeData?.conditions?.length
        ? conditionsToQuery(nodeData.conditions, nodeData.conditions[0]?.logical_operator)
        : createEmptyQuery(),
    );
  }, [isOpen, nodeData]);

  const updateRule = useCallback((index: number, patch: Partial<ConditionRule>) => {
    setQuery((previous) => {
      const rules = [...previous.rules];
      rules[index] = { ...rules[index], ...patch };
      return { ...previous, rules };
    });
  }, []);

  const handleFieldChange = useCallback(
    (index: number, field: string) => {
      const subModule = field.includes('.') ? field.split('.')[0] : '';
      // Operator and value depend on the field's type, so both are cleared.
      updateRule(index, { field, sub_module: subModule, operator: '', value: '' });
    },
    [updateRule],
  );

  const addCondition = useCallback(() => {
    setQuery((previous) => ({ ...previous, rules: [...previous.rules, createEmptyRule()] }));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setQuery((previous) =>
      previous.rules.length <= 1
        ? previous
        : { ...previous, rules: previous.rules.filter((_, position) => position !== index) },
    );
  }, []);

  const changeConditionType = useCallback(
    (index: number, conditionType: ConditionType) => {
      setQuery((previous) => {
        const rules = [...previous.rules];
        rules[index] = resetRuleForConditionType(rules[index], conditionType);
        return { ...previous, rules };
      });
    },
    [],
  );

  const changeCombinator = useCallback((combinator: string) => {
    setQuery((previous) => ({ ...previous, combinator: combinator.toLowerCase() }));
  }, []);

  const isValid = useMemo(
    () => Boolean(title.trim()) && isQueryComplete(query),
    [title, query],
  );

  const handleSave = () => {
    if (!nodeId) return;
    const { conditions, logical_operator } = queryToConditions(query);
    onSave(
      nodeId,
      {
        label: title.trim() || t(I18N.sidebar.criteriaTitle),
        conditions,
        logicOperator: logical_operator,
      },
      parentNodeId ?? '',
    );
  };

  /**
   * The field picker is driven by `customFetchApi`, which the ERP
   * `SearchableSelect` calls once when it mounts and then owns — it does not
   * re-run because the source it closed over later has data. Rendering a row
   * before the entity-field catalogue resolved therefore produced a picker
   * permanently stuck on an empty list, which is why only the *first* condition
   * was affected: by the time the user added a second one the request had
   * landed, so that row mounted against a populated source.
   *
   * Holding the rows back until the catalogue settles fixes it at the source,
   * for every row and for both add and edit. The request is cached for five
   * minutes and shared, so re-opening the drawer renders straight through.
   */
  const renderConditions = () => {
    if (isFieldCatalogueLoading) return <LoadingState minHeight={160} />;

    if (fieldCatalogueError) {
      return (
        <ErrorState
          error={fieldCatalogueError}
          onRetry={refetchFieldCatalogue}
          retryLabel={t(I18N.common.retry)}
          minHeight={160}
        />
      );
    }

    return (
      <>
        {query.rules.map((rule, index) => (
          <Box key={rule.id} display="flex" flexDirection="column">
            {index > 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1,
                  '&::before, &::after': {
                    content: '""',
                    flex: 1,
                    height: '1px',
                    bgcolor: BORDER,
                  },
                }}
              >
                <Box width={104}>
                  <SearchableSelect
                    disabled={readOnly}
                    options={logicalOperators}
                    size="small"
                    showCancelButton={false}
                    value={query.combinator.toUpperCase()}
                    onChange={(event: { target: { value: string } }) =>
                      changeCombinator(String(event.target.value))
                    }
                  />
                </Box>
              </Box>
            ) : null}

            <CriteriaConditionRow
              rule={rule}
              index={index}
              fieldGroups={entityFieldGroups}
              operators={operators}
              aggregateFunctions={aggregateFunctions}
              onChange={updateRule}
              onFieldChange={handleFieldChange}
              onConditionTypeChange={changeConditionType}
              onRemove={removeCondition}
              canRemove={query.rules.length > 1}
              readOnly={readOnly}
            />
          </Box>
        ))}

        {readOnly ? null : (
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<AddIcon fontSize="small" />}
            onClick={addCondition}
            sx={{ py: 1, ...outlinedBorderSx('dashed') }}
          >
            {t(I18N.sidebar.criteriaAdd)}
          </Button>
        )}
      </>
    );
  };

  return (
    <SidebarShell
      isOpen={isOpen}
      onClose={onClose}
      onSave={readOnly ? undefined : handleSave}
      title={t(I18N.sidebar.criteriaTitle)}
      subtitle={t(I18N.sidebar.criteriaSubtitle)}
      icon={<CriteriaIcon fontSize="small" />}
      saveDisabled={!isValid || isFieldCatalogueLoading || Boolean(fieldCatalogueError)}
      saveLabel={t(I18N.common.save)}
      cancelLabel={t(readOnly ? I18N.node.detailsClose : I18N.common.cancel)}
    >
      <FormField label={t(I18N.sidebar.criteriaName)} required htmlFor="criteria-title">
        <TextField
          id="criteria-title"
          disabled={readOnly}
          size="small"
          fullWidth
          value={title}
          onChange={(event: { target: { value: string } }) => setTitle(event.target.value)}
          placeholder={t(I18N.sidebar.criteriaNamePlaceholder)}
        />
      </FormField>

      <Box display="flex" flexDirection="column" gap={1.5}>
        <Typography type="s4" weight="bold" color={TEXT_STRONG}>
          {t(I18N.sidebar.criteriaConditions)}
        </Typography>

        {renderConditions()}
      </Box>
    </SidebarShell>
  );
};
