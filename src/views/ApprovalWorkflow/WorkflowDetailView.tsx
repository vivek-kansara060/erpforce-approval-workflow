import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Box, Grid, MenuItem } from '@mui/material';
import {
  AccountTreeOutlinedIcon as FlowIcon,
  KeyboardArrowDownIcon as ArrowDownIcon,
} from '../../ui/icons';
import { Button, ConfirmModal, Menu, Typography, ValueField } from '../../ui';
import { SURFACE, TEXT_DANGER, TEXT_STRONG } from '../../ui/tokens';
import { AsyncBoundary, LoadingState } from '../../components/feedback';
import { PageHeader, PageShell, SectionCard } from '../../components/layout';
import { WorkflowStatusChip, WorkflowSummaryCard } from '../../components/workflow';
import { PermissionGate } from '../../permissions/PermissionGate';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { I18N } from '../../constants/i18n-keys';
import { withId } from '../../utils/route';
import { formatTimestamp } from '../../utils/format';
import { toWorkflowScope } from '../../utils/workflow-payload';
import { useWorkflow, useWorkflowMutations } from '../../hooks/useWorkflow';
import { useEntityCatalogue, useReferenceOptions } from '../../hooks/useWorkflowReferences';
import {
  useApprovalWorkflowConfig,
  useNotifyError,
  useTranslate,
} from '../../providers/useApprovalWorkflowConfig';

const WorkflowBuilder = lazy(() =>
  import('../../components/builder/WorkflowBuilder').then((module) => ({
    default: module.WorkflowBuilder,
  })),
);

export interface WorkflowDetailViewProps {
  workflowId: string;
  /** Format a timestamp for display; defaults to the browser locale. */
  formatDate?: (value: string) => string;
}

const DETAIL_MAX_WIDTH = 1080;

/** Read-only workflow, with the flow rendered on a non-interactive canvas. */
export const WorkflowDetailView = ({ workflowId, formatDate }: WorkflowDetailViewProps) => {
  const t = useTranslate();
  const { routes, navigate, notify } = useApprovalWorkflowConfig();
  const permissions = useApprovalPermissions();

  const notifyError = useNotifyError();
  const { workflow, isLoading, error, refetch } = useWorkflow(workflowId);
  const { remove, isRemoving } = useWorkflowMutations({ onError: notifyError });
  const { labelOf } = useEntityCatalogue();
  const { options: requestTypes } = useReferenceOptions('action_type');

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const requestTypeLabel = useMemo(
    () => requestTypes.find((option) => option.value === workflow?.request_type)?.label ?? '-',
    [requestTypes, workflow?.request_type],
  );

  const createdAtLabel = useMemo(() => {
    const formatted = formatTimestamp(workflow?.created_at, { formatDate });
    return formatted ? `${t(I18N.workflow.createdOn)}: ${formatted}` : undefined;
  }, [workflow?.created_at, formatDate, t]);

  const scope = useMemo(() => toWorkflowScope(workflow), [workflow]);

  const handleDelete = useCallback(async () => {
    if (!workflow?.id) return;
    // A failed delete keeps the dialog open; `useNotifyError` has told the user.
    if (!(await remove(String(workflow.id)))) return;
    notify(t(I18N.workflow.deletedMessage), 'success');
    setIsDeleteOpen(false);
    navigate(routes.workflowList);
  }, [workflow?.id, remove, notify, t, navigate, routes.workflowList]);

  const openFlow = useCallback(() => setIsFlowOpen(true), []);

  const hasActions = permissions['workflow.edit'] || permissions['workflow.delete'];

  return (
    <PermissionGate capability="workflow.viewById">
      <AsyncBoundary isLoading={isLoading} error={error} onRetry={refetch} variant="page">
        <Box sx={{ bgcolor: SURFACE, minHeight: '100%' }}>
          <PageHeader
            title={
              isFlowOpen ? t(I18N.workflow.builder) : (workflow?.name ?? t(I18N.workflow.title))
            }
            subtitle={isFlowOpen ? labelOf(workflow?.entity_type) : workflow?.series_number}
            adornment={
              isFlowOpen ? undefined : <WorkflowStatusChip isActive={workflow?.is_active} />
            }
            onBack={isFlowOpen ? () => setIsFlowOpen(false) : () => navigate(routes.workflowList)}
            backLabel={t(I18N.common.back)}
            actions={
              hasActions ? (
                <>
                  <Button
                    variant="outlined"
                    endIcon={<ArrowDownIcon fontSize="small" />}
                    onClick={(event: React.MouseEvent<HTMLElement>) =>
                      setMenuAnchor(event.currentTarget)
                    }
                  >
                    {t(I18N.common.actions)}
                  </Button>

                  <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                  >
                    {permissions['workflow.edit'] ? (
                      <MenuItem
                        onClick={() => {
                          setMenuAnchor(null);
                          navigate(withId(routes.workflowEdit, workflow?.id));
                        }}
                      >
                        <Typography type="s4" color={TEXT_STRONG}>
                          {t(I18N.common.edit)}
                        </Typography>
                      </MenuItem>
                    ) : null}

                    {permissions['workflow.delete'] ? (
                      <MenuItem
                        onClick={() => {
                          setMenuAnchor(null);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Typography type="s4" color={TEXT_DANGER}>
                          {t(I18N.common.delete)}
                        </Typography>
                      </MenuItem>
                    ) : null}
                  </Menu>
                </>
              ) : null
            }
          />

          {isFlowOpen ? (
            <Suspense fallback={<LoadingState variant="page" />}>
              <WorkflowBuilder
                readOnly
                showHeader={false}
                initialGraph={workflow?.graph}
                entityType={workflow?.entity_type ?? ''}
                entityLabel={labelOf(workflow?.entity_type)}
                scope={scope}
                onBack={() => setIsFlowOpen(false)}
              />
            </Suspense>
          ) : (
            <PageShell maxWidth={DETAIL_MAX_WIDTH}>
              <SectionCard title={t(I18N.workflow.detailsSection)}>
                <Grid container rowSpacing={2.5} columnSpacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <ValueField label={t(I18N.fields.id)}>
                      {workflow?.series_number || '-'}
                    </ValueField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <ValueField label={t(I18N.fields.name)}>{workflow?.name || '-'}</ValueField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <ValueField label={t(I18N.fields.entityType)}>
                      {labelOf(workflow?.entity_type) || '-'}
                    </ValueField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <ValueField label={t(I18N.fields.requestType)}>{requestTypeLabel}</ValueField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <ValueField label={t(I18N.fields.status)}>
                      <WorkflowStatusChip isActive={workflow?.is_active} />
                    </ValueField>
                  </Grid>
                  <Grid item xs={12}>
                    <ValueField label={t(I18N.fields.description)}>
                      {workflow?.description || '-'}
                    </ValueField>
                  </Grid>
                </Grid>
              </SectionCard>

              <SectionCard
                title={t(I18N.workflow.approvalFlow)}
                description={createdAtLabel}
                icon={<FlowIcon fontSize="small" />}
                actions={
                  <Button
                    variant="outlined"
                    size="small"
                    // Viewing stays read-only: editing is the Actions menu's job.
                    onClick={openFlow}
                  >
                    {t(I18N.workflow.openInEditor)}
                  </Button>
                }
              >
                <WorkflowSummaryCard graph={workflow?.graph} />
              </SectionCard>
            </PageShell>
          )}

          <ConfirmModal
            open={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            onConfirm={handleDelete}
            loading={isRemoving}
            title={`${t(I18N.common.delete)} ${t(I18N.workflow.title)}`}
            description={`${t(I18N.common.deleteMessage)} ${workflow?.name ?? ''}?`}
          />
        </Box>
      </AsyncBoundary>
    </PermissionGate>
  );
};
