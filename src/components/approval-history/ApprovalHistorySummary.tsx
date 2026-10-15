import { Box } from '@mui/material';
import { Typography } from '../../ui';
import {
  BORDER,
  FILL_SUBTLE,
  RADIUS,
  SURFACE,
  TEXT_BODY,
  TEXT_STRONG,
  TEXT_SUBTLE,
} from '../../ui/tokens';
import { STATUS_TONES } from '../workflow/status-tone';
import { presentStatus } from './status-presentation';
import { Timestamp } from './primitives';
import type { TimestampFormatter } from './format-time';
import { I18N } from '../../constants/i18n-keys';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import type { ApprovalHistorySummary as Summary } from '../../types/approval';

/** How many pending approvers are named before collapsing to "+N more". */
const NAMED_LIMIT = 2;

const Chip = ({ children }: { children: string }) => (
  <Box
    component="span"
    sx={{
      px: 0.875,
      py: 0.125,
      borderRadius: RADIUS.pill,
      bgcolor: FILL_SUBTLE,
      border: '1px solid',
      borderColor: BORDER,
      whiteSpace: 'nowrap',
    }}
  >
    <Typography type="s5" weight="medium" color={TEXT_BODY}>
      {children}
    </Typography>
  </Box>
);

export interface ApprovalHistorySummaryProps {
  summary: Summary;
  formatTime: TimestampFormatter;
}

/** Where the record stands now: status, who it is waiting on, who asked. */
export const ApprovalHistorySummary = ({ summary, formatTime }: ApprovalHistorySummaryProps) => {
  const t = useTranslate();
  const { summary: headline, tone, Icon } = presentStatus(summary.status, undefined, t);
  const { dot, fill } = STATUS_TONES[tone];

  const named = summary.pendingWith.slice(0, NAMED_LIMIT);
  const more = summary.pendingWith.length - named.length + summary.pendingUnnamed;

  const detail =
    summary.status === 'Pending' && (named.length > 0 || more > 0)
      ? {
          label: t(I18N.history.waitingOn),
          value: [named.join(', '), more > 0 ? `+${more} ${t(I18N.history.otherApprovers)}` : '']
            .filter(Boolean)
            .join(' '),
        }
      : summary.status === 'Rejected' && summary.rejectedBy
        ? { label: t(I18N.history.rejectedBy), value: summary.rejectedBy }
        : undefined;

  const updated = formatTime(summary.lastActivityAt);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: BORDER,
        borderRadius: RADIUS.card,
        bgcolor: SURFACE,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, p: 1.75 }}>
        <Box
          aria-hidden
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: fill,
            color: dot,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Box display="flex" alignItems="center" flexWrap="wrap" columnGap={1} rowGap={0.5}>
            <Typography type="s2" weight="bold" color={TEXT_STRONG}>
              {headline}
            </Typography>
            {summary.currentLevel !== undefined ? (
              <Chip>{`${t(I18N.history.level)} ${summary.currentLevel}`}</Chip>
            ) : null}
            {summary.roundCount > 1 ? (
              <Chip>{`${t(I18N.history.round)} ${summary.roundCount}`}</Chip>
            ) : null}
          </Box>

          {detail ? (
            <Typography type="s5" color={TEXT_SUBTLE} sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
              {detail.label}{' '}
              <Box component="span" sx={{ color: TEXT_BODY, fontWeight: 600 }}>
                {detail.value}
              </Box>
            </Typography>
          ) : null}
        </Box>
      </Box>

      {summary.requestedBy || updated ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 1.75,
            py: 1,
            bgcolor: FILL_SUBTLE,
            borderTop: '1px solid',
            borderColor: BORDER,
          }}
        >
          <Typography type="s5" color={TEXT_SUBTLE} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {summary.requestedBy ? (
              <>
                {t(I18N.history.requestedBy)}{' '}
                <Box component="span" sx={{ color: TEXT_BODY, fontWeight: 500 }}>
                  {summary.requestedBy}
                </Box>
              </>
            ) : null}
          </Typography>
          {updated ? (
            <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
              <Typography type="s5" color={TEXT_SUBTLE}>
                {t(I18N.history.updated)}
              </Typography>
              <Timestamp value={updated} />
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
};
