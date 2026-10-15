import { Box, Grid } from '@mui/material';
import { Button, Typography, ValueField } from '../../ui';
import { BORDER, RADIUS, SURFACE, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';
import { AsyncBoundary, EmptyState } from '../../components/feedback';
import { PageHeader, PageShell, SectionCard } from '../../components/layout';
import { ApprovalStatusChip } from '../../components/workflow';
import { DecisionModals } from './DecisionModals';
import { useApprovalRecordLinks } from './useApprovalRecordLinks';
import { PermissionGate } from '../../permissions/PermissionGate';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { I18N } from '../../constants/i18n-keys';
import { isPending } from '../../utils/status';
import { formatTimestamp } from '../../utils/format';
import { useApprovalRequest } from '../../hooks/useApprovalRequests';
import { useApprovalDecision } from '../../hooks/useApprovalDecision';
import { useApprovalWorkflowConfig, useTranslate } from '../../providers/useApprovalWorkflowConfig';

export interface ApprovalRequestDetailViewProps {
  requestId: string;
  formatDate?: (value: string) => string;
}

/** One approval request: its details, its history, and the decision buttons. */
export const ApprovalRequestDetailView = ({
  requestId,
  formatDate,
}: ApprovalRequestDetailViewProps) => {
  const t = useTranslate();
  const { navigate, routes } = useApprovalWorkflowConfig();
  const permissions = useApprovalPermissions();
  const { entityTitle, recordRoute, openRecord } = useApprovalRecordLinks();

  const {
    request,
    history,
    isLoading,
    isHistoryLoading,
    error,
    historyError,
    refetch,
    refetchHistory,
  } = useApprovalRequest(requestId);

  const decision = useApprovalDecision({ onCompleted: refetch });

  const formatDateTime = (value: string | undefined) =>
    formatTimestamp(value, { formatDate, withTime: true }) ?? '-';

  const actionable = isPending(request?.status);
  // Same gate as the queue: while the adapter's pre-action applies, Approve
  // opens it and Reject is unavailable.
  const pendingPreAction = request ? decision.getPendingPreAction(request) : undefined;

  return (
    <PermissionGate capability="approval.viewById">
      <AsyncBoundary isLoading={isLoading} error={error} onRetry={refetch} variant="page">
        <Box sx={{ bgcolor: SURFACE, minHeight: '100%' }}>
          <PageHeader
            title={request?.series_number ?? `#${requestId}`}
            adornment={<ApprovalStatusChip status={request?.status} />}
            onBack={() => navigate(routes.approvalDashboard)}
            backLabel={t(I18N.common.back)}
            actions={
              <>
                {request && recordRoute(request) ? (
                  <Button variant="outlined" onClick={() => openRecord(request)}>
                    {t(I18N.common.view)}
                  </Button>
                ) : null}

                {request && actionable ? (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      disabled={!permissions['approval.approve']}
                      onClick={() => decision.startApproval(request)}
                    >
                      {t(I18N.dashboard.approve)}
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      disabled={!permissions['approval.reject'] || Boolean(pendingPreAction)}
                      onClick={() => decision.openDecision(request, 'Rejected')}
                    >
                      {t(I18N.dashboard.reject)}
                    </Button>
                  </>
                ) : null}
              </>
            }
          />

          <PageShell maxWidth={1080}>
            <SectionCard title={t(I18N.dashboard.requestDetails)} collapsible>
              <Grid container rowSpacing={2.5} columnSpacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <ValueField label={t(I18N.fields.id)}>
                    {request?.series_number ?? request?.id ?? '-'}
                  </ValueField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ValueField label={t(I18N.fields.requestType)}>
                    {request ? entityTitle(request) : '-'}
                  </ValueField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ValueField label={t(I18N.dashboard.requestedBy)}>
                    {request?.created_by_user ?? request?.created_by_data?.name ?? '-'}
                  </ValueField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ValueField label={t(I18N.dashboard.requestedOn)}>
                    {formatDateTime(request?.created_at)}
                  </ValueField>
                </Grid>
                <Grid item xs={12}>
                  <ValueField label={t(I18N.dashboard.comments)}>
                    {request?.comments || '-'}
                  </ValueField>
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard
              title={t(I18N.dashboard.history)}
              collapsible
              disableBodyPadding={history.length === 0 && !historyError}
            >
              <AsyncBoundary
                isLoading={isHistoryLoading}
                error={historyError}
                onRetry={refetchHistory}
                errorTitle={t(I18N.history.loadFailed)}
                isEmpty={history.length === 0}
                empty={<EmptyState title={t(I18N.dashboard.noActivity)} minHeight={160} />}
              >
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {history.map((entry) => (
                    <Box
                      key={String(entry.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        border: '1px solid',
                        borderColor: BORDER,
                        borderRadius: RADIUS.card,
                      }}
                    >
                      <Box minWidth={0}>
                        <Typography type="s4" weight="medium" color={TEXT_STRONG}>
                          {entry.actor_name ?? String(entry.actor_id ?? '-')}
                        </Typography>
                        {entry.comments ? (
                          <Typography type="s5" color={TEXT_SUBTLE}>
                            {entry.comments}
                          </Typography>
                        ) : null}
                      </Box>

                      <Box display="flex" alignItems="center" gap={1.5} flexShrink={0}>
                        <ApprovalStatusChip status={entry.status} />
                        <Typography type="s5" color={TEXT_SUBTLE}>
                          {formatDateTime(entry.acted_at)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </AsyncBoundary>
            </SectionCard>
          </PageShell>

          <DecisionModals decision={decision} />
        </Box>
      </AsyncBoundary>
    </PermissionGate>
  );
};
