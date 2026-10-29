import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Chip, FormControlLabel, IconButton } from '@mui/material';
import { AddIcon, ArrowDownwardIcon, ArrowUpwardIcon } from '../../../ui/icons';
import {
  ActionIcon,
  Button,
  Checkbox,
  SearchableSelect,
  TextField,
  Typography,
} from '../../../ui';
import {
  BORDER,
  RADIUS,
  SURFACE,
  TEXT_STRONG,
  TEXT_SUBTLE,
  outlinedBorderSx,
} from '../../../ui/tokens';
import { moveItem } from '../../../utils/array';
import { FormField } from '../../layout';
import { SidebarShell } from './SidebarShell';
import { NumberedCard } from './NumberedCard';
import { I18N } from '../../../constants/i18n-keys';
import {
  AUTO_APPROVE_UNIT_OPTIONS,
  AUTO_APPROVE_VALUE_OPTIONS,
} from '../../../constants/options';
import {
  RESULT_BRANCH_PRESENTATION,
  createDefaultApproverStage,
} from '../../../constants/defaults';
import {
  draftToStage,
  hasActionType,
  isStageComplete,
  stageToDraft,
} from '../../../utils/approver-config';
import { useTranslate } from '../../../providers/useApprovalWorkflowConfig';
import { useHierarchyLevels, useReferenceOptions } from '../../../hooks/useWorkflowReferences';
import { useApproverUserSource } from '../../../hooks/useApproverUserSource';
import { useApprovalPermissions } from '../../../permissions/usePermission';
import { selectApproverTypeOptions } from '../../../permissions/derive-options';
import type { ApproverStageDraft, ApproverType } from '../../../types/approver';
import type { ActionNodeData, ResultNodeData } from '../../../types/graph';
import type { WorkflowScope } from '../../../types/workflow';

/**
 * The shared select can only summarise a multi-selection as "N Selected". The
 * chosen approvers are listed by name below it instead, so the badge is hidden
 * and the field keeps an "add" prompt.
 */
const hideCountBadgeSx = {
  '& .MuiSelect-select .MuiChip-root': { display: 'none' },
  '& .MuiSelect-select:has(.MuiChip-root)::before': {
    content: '"Add more approvers"',
    color: TEXT_SUBTLE,
    fontSize: 14,
  },
};

export interface ActionSidebarProps {
  isOpen: boolean;
  nodeId: string | null;
  parentNodeId: string | null;
  nodeData: (ActionNodeData & Partial<ResultNodeData>) | null;
  onClose: () => void;
  onSave: (nodeId: string, data: ActionNodeData, parentNodeId: string) => void;
  module: string;
  /** Company/location scope, used to filter department, user and level lookups. */
  scope: WorkflowScope;
  /** Show the saved stages without editing: no save, add or remove. */
  readOnly?: boolean;
}

/**
 * Configures the approval stages of an action node.
 *
 * Each stage picks an action type and an approver strategy (user, department or
 * hierarchy). Strategies whose master data the signed-in user cannot read are
 * removed from the Approval Type list rather than offered and then failing on
 * save. `User` is always offered; only the directory behind it varies — see
 * `useApproverUserSource`.
 *
 * A stage already configured with a now-hidden strategy still renders its own
 * editor, so opening someone else's workflow shows what it does instead of
 * quietly dropping the configuration on save.
 *
 * A stage is a bordered card with its own numbered header, so a three-stage
 * action reads as three blocks instead of one uninterrupted column of inputs
 * separated by a lone divider.
 */
export const ActionSidebar = ({
  isOpen,
  nodeId,
  parentNodeId,
  nodeData,
  onClose,
  onSave,
  module,
  scope,
  readOnly = false,
}: ActionSidebarProps) => {
  const t = useTranslate();
  const permissions = useApprovalPermissions();
  const userSource = useApproverUserSource(scope);
  // Names for the selected approver ids. The select only reports them as it
  // loads options, so they are collected here and the chips fill in as they arrive.
  const [approverNames, setApproverNames] = useState<Record<string, string>>({});
  const rememberApprovers = useCallback((options: unknown) => {
    const list = Array.isArray(options) ? options : options ? [options] : [];
    setApproverNames((previous) => {
      let next = previous;
      for (const option of list as Array<{ value?: string | number; label?: unknown }>) {
        if (option?.value === undefined || typeof option.label !== 'string') continue;
        if (next[String(option.value)] === option.label) continue;
        if (next === previous) next = { ...previous };
        next[String(option.value)] = option.label;
      }
      return next;
    });
  }, []);

  const [title, setTitle] = useState('');
  const [stages, setStages] = useState<ApproverStageDraft[]>(() => [
    createDefaultApproverStage(module),
  ]);

  const { options: actionTypes } = useReferenceOptions('action_type', { enabled: isOpen });

  /**
   * The drawer stays mounted for the builder's whole life, so an ungated query
   * here requested hierarchy levels on every canvas visit, drawer opened or
   * not. Only an open drawer that can offer, or already shows, a Hierarchy
   * stage needs them.
   */
  const needsHierarchyLevels =
    isOpen &&
    (permissions['workflow.approver.hierarchy'] ||
      stages.some((stage) => stage.approver_type === 'HIERARCHY'));
  const { levels } = useHierarchyLevels(
    { company_ids: scope.company_ids, location_ids: scope.location_ids },
    { enabled: needsHierarchyLevels },
  );

  const approverTypeOptions = useMemo(
    () => selectApproverTypeOptions(permissions),
    [permissions],
  );

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setStages([createDefaultApproverStage(module)]);
      return;
    }
    setTitle(nodeData?.label ?? '');
    setStages(
      nodeData?.action?.length
        ? nodeData.action.map((stage) => stageToDraft(stage, module))
        : [createDefaultApproverStage(module)],
    );
  }, [isOpen, nodeData, module]);

  const updateStage = useCallback(
    <TKey extends keyof ApproverStageDraft>(
      index: number,
      key: TKey,
      value: ApproverStageDraft[TKey],
    ) => {
      setStages((previous) =>
        previous.map((stage, position) =>
          position === index ? { ...stage, [key]: value } : stage,
        ),
      );
    },
    [],
  );

  const addStage = useCallback(() => {
    // A fresh object per stage: pushing the shared default made every stage
    // reference the same object in the original.
    setStages((previous) => [...previous, createDefaultApproverStage(module)]);
  }, [module]);

  const removeStage = useCallback((index: number) => {
    setStages((previous) =>
      previous.length > 1 ? previous.filter((_, position) => position !== index) : previous,
    );
  }, []);

  // Stage order is approval order: the engine runs them one after another in
  // this sequence, so moving one changes who approves first.
  const moveStage = useCallback((index: number, to: number) => {
    setStages((previous) => moveItem(previous, index, to));
  }, []);

  const isValid = useMemo(
    () => Boolean(title.trim()) && stages.some(isStageComplete),
    [title, stages],
  );

  const handleSave = () => {
    if (!nodeId) return;
    onSave(
      nodeId,
      {
        label: title.trim() || t(I18N.sidebar.actionTitle),
        // Blank rows are not actions. Saving one persisted a stage with an
        // empty action key, which the engine turned into a no-op `custom`
        // action; removing every stage correctly persists an empty list.
        action: stages.filter(hasActionType).map((stage) => draftToStage(stage, module)),
      },
      parentNodeId ?? '',
    );
  };

  const branch = (nodeData?.resultType ?? nodeData?.type) as 'pass' | 'fail' | undefined;
  const branchPresentation = branch ? RESULT_BRANCH_PRESENTATION[branch] : undefined;

  return (
    <SidebarShell
      isOpen={isOpen}
      onClose={onClose}
      onSave={readOnly ? undefined : handleSave}
      title={t(I18N.sidebar.actionTitle)}
      subtitle={t(I18N.sidebar.actionSubtitle)}
      icon={<ActionIcon fontSize="small" />}
      iconBgColor="theme.primary.100"
      iconColor="theme.primary.1000"
      saveDisabled={!isValid}
      saveLabel={t(I18N.sidebar.saveAndAdd)}
      cancelLabel={t(readOnly ? I18N.node.detailsClose : I18N.common.cancel)}
      badge={
        branchPresentation ? (
          <Box
            sx={{
              alignSelf: 'flex-start',
              bgcolor: branchPresentation.backgroundColor,
              color: branchPresentation.color,
              borderRadius: RADIUS.pill,
              px: 1.25,
              py: 0.5,
            }}
          >
            <Typography type="s5" weight="medium" color="inherit">
              {t([branchPresentation.labelKey, branchPresentation.labelFallback] as const)}
            </Typography>
          </Box>
        ) : undefined
      }
    >
      <FormField label={t(I18N.sidebar.actionName)} required htmlFor="action-title">
        <TextField
          id="action-title"
          disabled={readOnly}
          size="small"
          fullWidth
          value={title}
          onChange={(event: { target: { value: string } }) => setTitle(event.target.value)}
          placeholder={t(I18N.sidebar.actionNamePlaceholder)}
        />
      </FormField>

      {stages.map((stage, index) => (
        <NumberedCard
          key={index}
          heading={
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                aria-hidden
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: BORDER,
                  bgcolor: SURFACE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography type="s5" weight="bold" color={TEXT_SUBTLE}>
                  {index + 1}
                </Typography>
              </Box>
              <Typography type="s4" weight="medium" color={TEXT_STRONG}>
                {`${t(I18N.sidebar.stage)} ${index + 1}`}
              </Typography>
            </Box>
          }
          actions={
            stages.length > 1 && !readOnly ? (
              <>
                <IconButton
                  size="small"
                  aria-label={`${t(I18N.sidebar.moveUp)} ${t(I18N.sidebar.stage)} ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => moveStage(index, index - 1)}
                  sx={{ color: TEXT_SUBTLE }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`${t(I18N.sidebar.moveDown)} ${t(I18N.sidebar.stage)} ${index + 1}`}
                  disabled={index === stages.length - 1}
                  onClick={() => moveStage(index, index + 1)}
                  sx={{ color: TEXT_SUBTLE }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </>
            ) : undefined
          }
          onRemove={stages.length > 1 && !readOnly ? () => removeStage(index) : undefined}
          removeLabel={`${t(I18N.common.delete)} ${t(I18N.sidebar.stage)} ${index + 1}`}
        >
          <FormField label={t(I18N.sidebar.action)}>
            <SearchableSelect
              disabled={readOnly}
              options={actionTypes}
              size="small"
              value={
                typeof stage.action_type_ref === 'object' && stage.action_type_ref
                  ? stage.action_type_ref.value
                  : ''
              }
              onChange={(_event: unknown, selected: ApproverStageDraft['action_type_ref']) =>
                updateStage(index, 'action_type_ref', selected)
              }
              placeholder={t(I18N.sidebar.actionPlaceholder)}
            />
          </FormField>

          <FormField label={t(I18N.sidebar.approvalType)}>
            <SearchableSelect
              disabled={readOnly}
              options={approverTypeOptions}
              size="small"
              value={stage.approver_type}
              onChange={(_event: unknown, selected: { value?: ApproverType } | undefined) =>
                updateStage(index, 'approver_type', selected?.value ?? '')
              }
              placeholder={t(I18N.sidebar.approvalTypePlaceholder)}
            />
          </FormField>

          {stage.approver_type === 'DEPARTMENT' ? (
            <>
              <FormField label={t(I18N.sidebar.department)}>
                <SearchableSelect
                  disabled={readOnly}
                  apiType="department"
                  size="small"
                  value={stage.department_id}
                  customeFilter={{ '&company_id.in': scope.company_ids ?? [] }}
                  onChange={(_event: unknown, selected: { value?: string | number } | undefined) =>
                    updateStage(index, 'department_id', selected?.value ?? '')
                  }
                  placeholder={t(I18N.sidebar.departmentPlaceholder)}
                />
              </FormField>

              <FormField label={t(I18N.sidebar.designation)}>
                <SearchableSelect
                  disabled={readOnly}
                  apiType="designation"
                  size="small"
                  value={stage.designation_id}
                  customeFilter={{
                    '&company_id.in': scope.company_ids ?? [],
                    '&department_id.eq': stage.department_id || 0,
                  }}
                  onChange={(_event: unknown, selected: { value?: string | number } | undefined) =>
                    updateStage(index, 'designation_id', selected?.value ?? '')
                  }
                  placeholder={t(I18N.sidebar.designationPlaceholder)}
                />
              </FormField>
            </>
          ) : null}

          {stage.approver_type === 'USER' ? (
            <FormField label={t(I18N.sidebar.users)}>
              <SearchableSelect
                disabled={readOnly}
                multiple
                size="small"
                {...userSource}
                value={stage.approver_ids}
                onChange={(_event: unknown, selected: Array<{ value: number }> | undefined) => {
                  rememberApprovers(selected);
                  updateStage(
                    index,
                    'approver_ids',
                    Array.isArray(selected) ? selected.map((entry) => entry.value) : [],
                  );
                }}
                getSelectedData={rememberApprovers}
                placeholder={t(I18N.sidebar.usersPlaceholder)}
                customStyle={hideCountBadgeSx}
              />
              {stage.approver_ids.length > 0 ? (
                <Box display="flex" flexWrap="wrap" gap={0.75} mt={1}>
                  {stage.approver_ids.map((id) => (
                    <Chip
                      key={id}
                      size="small"
                      label={approverNames[String(id)] ?? '…'}
                      onDelete={
                        readOnly
                          ? undefined
                          : () =>
                              updateStage(
                                index,
                                'approver_ids',
                                stage.approver_ids.filter((current) => current !== id),
                              )
                      }
                      sx={{
                        maxWidth: '100%',
                        bgcolor: 'theme.primary.100',
                        color: 'theme.primary.800',
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': { color: 'theme.primary.800' },
                      }}
                    />
                  ))}
                </Box>
              ) : null}
            </FormField>
          ) : null}

          {stage.approver_type === 'HIERARCHY' ? (
            <FormField label={t(I18N.sidebar.level)}>
              <SearchableSelect
                disabled={readOnly}
                options={levels}
                size="small"
                value={stage.level}
                onChange={(_event: unknown, selected: { value?: string } | undefined) =>
                  updateStage(index, 'level', selected?.value ?? '')
                }
                placeholder={t(I18N.sidebar.levelPlaceholder)}
              />
            </FormField>
          ) : null}

          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: BORDER,
              pt: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <FormControlLabel
              sx={{ ml: 0, mr: 0, alignItems: 'flex-start', gap: 1 }}
              control={
                <Checkbox
                  disabled={readOnly}
                  size="small"
                  sx={{ p: 0, mt: 0.125 }}
                  checked={stage.auto_approve_enabled}
                  onChange={(event: { target: { checked: boolean } }) =>
                    updateStage(index, 'auto_approve_enabled', event.target.checked)
                  }
                />
              }
              label={
                <Typography type="s5" color={TEXT_SUBTLE}>
                  {t(I18N.sidebar.autoApprove)}
                </Typography>
              }
            />

            {stage.auto_approve_enabled ? (
              <Box display="flex" gap={1.5} pl={3}>
                <Box flex={1}>
                  <SearchableSelect
                    disabled={readOnly}
                    options={AUTO_APPROVE_VALUE_OPTIONS}
                    size="small"
                    value={stage.auto_approve_value}
                    onChange={(_event: unknown, selected: { value?: number } | undefined) =>
                      updateStage(index, 'auto_approve_value', selected?.value ?? '')
                    }
                    placeholder={t(I18N.sidebar.autoApproveValue)}
                  />
                </Box>
                <Box flex={1}>
                  <SearchableSelect
                    disabled={readOnly}
                    options={AUTO_APPROVE_UNIT_OPTIONS}
                    size="small"
                    value={stage.auto_approve_unit}
                    onChange={(_event: unknown, selected: { value?: string } | undefined) =>
                      updateStage(index, 'auto_approve_unit', selected?.value ?? '')
                    }
                    placeholder={t(I18N.sidebar.autoApproveUnit)}
                  />
                </Box>
              </Box>
            ) : null}
          </Box>
        </NumberedCard>
      ))}

      {readOnly ? null : (
        <Button
          variant="outlined"
          size="small"
          fullWidth
          startIcon={<AddIcon fontSize="small" />}
          onClick={addStage}
          sx={{ py: 1, ...outlinedBorderSx('dashed') }}
        >
          {t(I18N.sidebar.addStage)}
        </Button>
      )}
    </SidebarShell>
  );
};
