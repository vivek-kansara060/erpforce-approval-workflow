import { useMemo } from 'react';
import { Box, Skeleton } from '@mui/material';
import { HistoryOutlinedIcon as HistoryIcon } from '../../ui/icons';
import { AsyncBoundary } from '../feedback/AsyncBoundary';
import { EmptyState } from '../feedback/EmptyState';
import { ApprovalHistorySummary } from './ApprovalHistorySummary';
import { ApprovalHistoryTimeline } from './ApprovalHistoryTimeline';
import { createTimestampFormatter } from './format-time';
import { useApprovalHistory } from '../../hooks/useApprovalHistory';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import { BORDER, RADIUS } from '../../ui/tokens';
import { I18N } from '../../constants/i18n-keys';

/** Placeholder shaped like the summary card and timeline, so opening does not jump. */
const HistorySkeleton = () => (
  <Box role="status" aria-busy="true" display="flex" flexDirection="column" gap={2.5}>
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 1.75,
        border: '1px solid',
        borderColor: BORDER,
        borderRadius: RADIUS.card,
      }}
    >
      <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
      <Box flexGrow={1}>
        <Skeleton variant="text" width="45%" height={24} />
        <Skeleton variant="text" width="70%" height={18} />
      </Box>
    </Box>
    {[0, 1].map((row) => (
      <Box key={row} display="flex" gap={1.5}>
        <Skeleton variant="circular" width={28} height={28} sx={{ flexShrink: 0 }} />
        <Box flexGrow={1}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="rounded" height={52} sx={{ mt: 1 }} />
        </Box>
      </Box>
    ))}
  </Box>
);

export interface ApprovalHistoryPanelProps {
  entityType: string;
  entityId: string | number | null | undefined;
  formatDate?: (iso: string) => string;
}

/**
 * Fetches and renders one record's approval history through the four states.
 *
 * Mounted only while the popover is open, so a closed button holds no cache
 * subscription and issues no request.
 */
export const ApprovalHistoryPanel = ({
  entityType,
  entityId,
  formatDate,
}: ApprovalHistoryPanelProps) => {
  const t = useTranslate();
  const { rounds, summary, isLoading, error, refetch } = useApprovalHistory({
    entityType,
    entityId,
  });

  // "Now" is fixed per open, so relative times do not drift while reading.
  const formatTime = useMemo(() => createTimestampFormatter(formatDate), [formatDate]);
  const isEmpty = rounds.length === 0;

  return (
    <AsyncBoundary
      isLoading={isLoading}
      // A failed background refresh keeps the history already on screen.
      error={isEmpty ? error : undefined}
      onRetry={refetch}
      errorTitle={t(I18N.history.loadFailed)}
      retryLabel={t(I18N.common.retry)}
      isEmpty={isEmpty}
      loading={<HistorySkeleton />}
      empty={
        <EmptyState
          title={t(I18N.history.emptyTitle)}
          description={t(I18N.history.emptyBody)}
          icon={<HistoryIcon fontSize="medium" />}
          minHeight={200}
        />
      }
    >
      <Box display="flex" flexDirection="column" gap={2.5}>
        {summary ? <ApprovalHistorySummary summary={summary} formatTime={formatTime} /> : null}
        <ApprovalHistoryTimeline rounds={rounds} formatTime={formatTime} />
      </Box>
    </AsyncBoundary>
  );
};
