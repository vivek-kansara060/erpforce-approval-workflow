import { useCallback } from 'react';
import { Box } from '@mui/material';
import { Typography } from '../../ui';
import { BORDER, FILL_SUBTLE, RADIUS, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';
import { ErrorState, LoadingState } from '../feedback';
import { I18N } from '../../constants/i18n-keys';
import { describeChanges } from '../../utils/history';
import { formatTimestamp } from '../../utils/format';
import { useWorkflowHistory } from '../../hooks/useWorkflow';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import type { I18nEntry } from '../../constants/i18n-keys';
import type { WorkflowHistoryEntry } from '../../types/workflow';

export interface WorkflowHistoryPanelProps {
  workflowId: string;
  /** Format a timestamp for display; defaults to the browser locale. */
  formatDate?: (value: string) => string;
}

const ACTION_COPY: Record<string, I18nEntry> = {
  create: I18N.workflowHistory.actionCreate,
  publish: I18N.workflowHistory.actionPublish,
  update: I18N.workflowHistory.actionUpdate,
  activate: I18N.workflowHistory.actionActivate,
  deactivate: I18N.workflowHistory.actionDeactivate,
  delete: I18N.workflowHistory.actionDelete,
};

const FIELD_COPY: Record<string, I18nEntry> = {
  name: I18N.workflowHistory.fieldName,
  description: I18N.workflowHistory.fieldDescription,
  entity_type: I18N.workflowHistory.fieldEntityType,
  request_type: I18N.workflowHistory.fieldRequestType,
  is_active: I18N.workflowHistory.fieldIsActive,
  status: I18N.workflowHistory.fieldStatus,
  graph: I18N.workflowHistory.fieldGraph,
  company_ids: I18N.workflow.scopeCompanies,
  location_ids: I18N.workflow.scopeLocations,
  department_ids: I18N.workflow.scopeDepartments,
  grade_ids: I18N.workflow.scopeGrades,
  employment_type_ids: I18N.workflow.scopeTypes,
};

/**
 * The change history of one workflow: a row per save, activation or deletion,
 * newest first, each saying who did it and which fields moved from what to what.
 *
 * Fetched only once mounted, and the view mounts it only when the user asks, so
 * a details page that never opens it never requests it.
 */
export const WorkflowHistoryPanel = ({ workflowId, formatDate }: WorkflowHistoryPanelProps) => {
  const t = useTranslate();
  const { entries, isLoading, error, refetch } = useWorkflowHistory(workflowId);

  /** How a stored value reads: translated words for states, counts for lists. */
  const renderValue = useCallback(
    (field: string, value: unknown): string => {
      if (value === undefined || value === null || value === '') return '-';
      if (field === 'is_active') return t(value ? I18N.workflow.active : I18N.workflow.inactive);
      if (field === 'status') {
        return t(value === 'published' ? I18N.workflow.statusPublished : I18N.workflow.statusDraft);
      }
      if (Array.isArray(value)) return `${value.length} ${t(I18N.workflowHistory.selected)}`;
      if (field === 'graph' && typeof value === 'object') {
        const flow = value as { nodes?: number; stages?: number };
        return `${flow.nodes ?? 0} ${t(I18N.workflowHistory.blocks)}, ${flow.stages ?? 0} ${t(I18N.workflowHistory.stages)}`;
      }
      return String(value);
    },
    [t],
  );

  if (isLoading) return <LoadingState minHeight={120} />;
  if (error)
    return <ErrorState error={error} onRetry={refetch} retryLabel={t(I18N.common.retry)} />;

  if (entries.length === 0) {
    return (
      <Typography type="s4" color={TEXT_SUBTLE}>
        {t(I18N.workflowHistory.empty)}
      </Typography>
    );
  }

  const renderEntry = (entry: WorkflowHistoryEntry) => {
    const who =
      entry.user_name || `${t(I18N.workflowHistory.unknownUser)} ${entry.user_id ?? ''}`.trim();
    const when = formatTimestamp(entry.created_at, { formatDate, withTime: true });
    const lines = describeChanges(entry);

    return (
      <Box
        key={entry.id}
        sx={{
          border: '1px solid',
          borderColor: BORDER,
          borderRadius: RADIUS.card,
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        <Box display="flex" justifyContent="space-between" gap={1} flexWrap="wrap">
          <Typography type="s4" color={TEXT_STRONG}>
            <strong>{who}</strong>{' '}
            {ACTION_COPY[entry.action] ? t(ACTION_COPY[entry.action]) : entry.action}
          </Typography>
          <Typography type="s5" color={TEXT_SUBTLE}>
            {when}
          </Typography>
        </Box>

        {lines.length > 0 ? (
          <Box sx={{ bgcolor: FILL_SUBTLE, borderRadius: RADIUS.control, px: 1.25, py: 0.75 }}>
            {lines.map((line) => (
              <Typography key={line.field} type="s5" color={TEXT_SUBTLE}>
                {`${FIELD_COPY[line.field] ? t(FIELD_COPY[line.field]) : line.field}: ${
                  'from' in line ? renderValue(line.field, line.from) : ''
                }${'from' in line && 'to' in line ? ' \u2192 ' : ''}${
                  'to' in line ? renderValue(line.field, line.to) : ''
                }`}
              </Typography>
            ))}
          </Box>
        ) : null}
      </Box>
    );
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.25}>
      {entries.map(renderEntry)}
    </Box>
  );
};
