import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { SendOutlinedIcon as SubmittedIcon } from '../../ui/icons';
import type { SvgIcon } from '@mui/material';
import { Button, Typography } from '../../ui';
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
import type { StatusTone } from '../workflow/status-tone';
import { presentStatus } from './status-presentation';
import { PersonAvatar, StatusPill, Timestamp } from './primitives';
import type { TimestampFormatter } from './format-time';
import { I18N } from '../../constants/i18n-keys';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import type { TranslateEntryFn } from '../../providers/useApprovalWorkflowConfig';
import type {
  ApprovalHistoryApprover,
  ApprovalHistoryLevelStep,
  ApprovalHistoryRound,
  ApprovalHistoryStep,
  ApprovalStatus,
} from '../../types/approval';

const Marker = ({
  Icon,
  tone,
  solid = false,
}: {
  Icon: typeof SvgIcon;
  tone: StatusTone;
  solid?: boolean;
}) => {
  const { dot, fill } = STATUS_TONES[tone];
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        bgcolor: solid ? dot : fill,
        color: solid ? SURFACE : dot,
      }}
    >
      <Icon sx={{ fontSize: 16 }} />
    </Box>
  );
};

/** Title on the left, time on the right, wrapping cleanly when names are long. */
const StepHeader = ({ title, time }: { title: ReactNode; time?: ReactNode }) => (
  <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
    <Box display="flex" alignItems="center" flexWrap="wrap" columnGap={1} rowGap={0.5} minWidth={0}>
      {title}
    </Box>
    {time}
  </Box>
);

const PersonName = ({ name, t }: { name: string | undefined; t: TranslateEntryFn }) => (
  <Typography
    type="s4"
    weight="medium"
    color={name ? TEXT_STRONG : TEXT_SUBTLE}
    sx={{ overflowWrap: 'anywhere' }}
  >
    {name ?? t(I18N.history.unknownUser)}
  </Typography>
);

const Remarks = ({ children }: { children: string }) => (
  <Box
    title={children}
    sx={{ mt: 0.75, px: 1.25, py: 0.75, bgcolor: FILL_SUBTLE, borderRadius: RADIUS.control }}
  >
    <Typography
      type="s5"
      color={TEXT_BODY}
      sx={{
        overflowWrap: 'anywhere',
        whiteSpace: 'pre-line',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {children}
    </Typography>
  </Box>
);

const ApproverRow = ({
  approver,
  formatTime,
  t,
}: {
  approver: ApprovalHistoryApprover;
  formatTime: TimestampFormatter;
  t: TranslateEntryFn;
}) => {
  const { pill, tone } = presentStatus(approver.status, approver.rawStatus, t);
  const decided = formatTime(approver.decidedAt);
  const closed = approver.status === 'Cancelled';

  return (
    <Box sx={{ display: 'flex', gap: 1.25, px: 1.25, py: 1 }}>
      <PersonAvatar name={approver.name} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <PersonName name={approver.name} t={t} />
          <StatusPill label={pill} tone={tone} />
        </Box>
        {closed || decided ? (
          <Box display="flex" alignItems="center" columnGap={0.75} flexWrap="wrap">
            {closed ? (
              <Typography type="s5" color={TEXT_SUBTLE}>
                {t(I18N.history.closedAutomatically)}
              </Typography>
            ) : null}
            <Timestamp value={decided} />
          </Box>
        ) : null}
        {approver.remarks ? <Remarks>{approver.remarks}</Remarks> : null}
      </Box>
    </Box>
  );
};

const LevelBody = ({
  step,
  formatTime,
  t,
}: {
  step: ApprovalHistoryLevelStep;
  formatTime: TimestampFormatter;
  t: TranslateEntryFn;
}) => (
  <>
    {step.message ? (
      <Typography
        type="s5"
        color={TEXT_SUBTLE}
        sx={{ mt: 0.5, fontStyle: 'italic', overflowWrap: 'anywhere' }}
      >
        {step.message}
      </Typography>
    ) : null}
    <Box
      sx={{
        mt: 1,
        border: '1px solid',
        borderColor: BORDER,
        borderRadius: RADIUS.card,
        bgcolor: SURFACE,
        '& > * + *': { borderTop: '1px solid', borderColor: BORDER },
      }}
    >
      {step.approvers.map((approver) => (
        <ApproverRow key={approver.id} approver={approver} formatTime={formatTime} t={t} />
      ))}
    </Box>
  </>
);

const Step = ({
  step,
  isLast,
  isResubmission,
  formatTime,
  t,
}: {
  step: ApprovalHistoryStep;
  isLast: boolean;
  isResubmission: boolean;
  formatTime: TimestampFormatter;
  t: TranslateEntryFn;
}) => {
  let marker: ReactNode;
  let content: ReactNode;

  if (step.kind === 'submitted') {
    marker = <Marker Icon={SubmittedIcon} tone="neutral" />;
    content = (
      <>
        <StepHeader
          title={
            <Typography type="s4" weight="bold" color={TEXT_STRONG}>
              {t(isResubmission ? I18N.history.resubmitted : I18N.history.submitted)}
            </Typography>
          }
          time={<Timestamp value={formatTime(step.at)} />}
        />
        {step.userName ? (
          <Box display="flex" alignItems="center" gap={0.75} mt={0.5}>
            <PersonAvatar name={step.userName} size={20} />
            <Typography
              type="s5"
              weight="medium"
              color={TEXT_BODY}
              sx={{ overflowWrap: 'anywhere' }}
            >
              {step.userName}
            </Typography>
          </Box>
        ) : null}
      </>
    );
  } else if (step.kind === 'level') {
    const { pill, tone, Icon } = presentStatus(step.status, undefined, t);
    marker = <Marker Icon={Icon} tone={tone} />;
    content = (
      <>
        <StepHeader
          title={
            <>
              <Typography type="s4" weight="bold" color={TEXT_STRONG}>
                {step.level !== undefined
                  ? `${t(I18N.history.level)} ${step.level}`
                  : t(I18N.history.approvalStep)}
              </Typography>
              {step.status ? <StatusPill label={pill} tone={tone} /> : null}
            </>
          }
          time={<Timestamp value={formatTime(step.at)} />}
        />
        <LevelBody step={step} formatTime={formatTime} t={t} />
      </>
    );
  } else {
    const { outcome, tone, Icon } = presentStatus(step.status, undefined, t);
    marker = <Marker Icon={Icon} tone={tone} solid />;
    content = (
      <>
        <StepHeader
          title={
            <Typography type="s4" weight="bold" color={TEXT_STRONG}>
              {outcome}
            </Typography>
          }
          time={<Timestamp value={formatTime(step.at)} />}
        />
        {step.status === 'Rejected' && step.userName ? (
          <Typography type="s5" color={TEXT_SUBTLE} sx={{ overflowWrap: 'anywhere' }}>
            {t(I18N.history.rejectedBy)}{' '}
            <Box component="span" sx={{ color: TEXT_BODY, fontWeight: 500 }}>
              {step.userName}
            </Box>
          </Typography>
        ) : null}
      </>
    );
  }

  return (
    <Box component="li" sx={{ display: 'flex', gap: 1.5 }}>
      <Box
        aria-hidden
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}
      >
        {marker}
        {isLast ? null : (
          <Box sx={{ width: '1px', flexGrow: 1, minHeight: 12, my: 0.5, bgcolor: BORDER }} />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1, pt: 0.5, pb: isLast ? 0 : 2.5 }}>{content}</Box>
    </Box>
  );
};

const Steps = ({
  round,
  formatTime,
  t,
}: {
  round: ApprovalHistoryRound;
  formatTime: TimestampFormatter;
  t: TranslateEntryFn;
}) => (
  <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
    {round.steps.map((step, index) => (
      <Step
        key={step.id}
        step={step}
        isLast={index === round.steps.length - 1}
        isResubmission={round.round > 1}
        formatTime={formatTime}
        t={t}
      />
    ))}
  </Box>
);

const RoundHeader = ({
  round,
  status,
  t,
  expanded,
  onToggle,
}: {
  round: number;
  status: ApprovalStatus | undefined;
  t: TranslateEntryFn;
  expanded?: boolean;
  onToggle?: () => void;
}) => {
  const { pill, tone } = presentStatus(status, undefined, t);

  return (
    <Box display="flex" alignItems="center" gap={1} mb={1.25} minHeight={28}>
      <Typography type="s5" weight="bold" color={TEXT_SUBTLE}>
        {`${t(I18N.history.round)} ${round}`}
      </Typography>
      {status ? <StatusPill label={pill} tone={tone} /> : null}
      <Box aria-hidden sx={{ flexGrow: 1, height: '1px', bgcolor: BORDER }} />
      {onToggle ? (
        <Button variant="text" size="small" onClick={onToggle} aria-expanded={expanded}>
          {t(expanded ? I18N.history.hideEarlier : I18N.history.showEarlier)}
        </Button>
      ) : null}
    </Box>
  );
};

export interface ApprovalHistoryTimelineProps {
  rounds: ApprovalHistoryRound[];
  formatTime: TimestampFormatter;
}

/**
 * The record's approval trail. The latest submission is open; earlier ones
 * (a rejected first attempt, say) are folded under their round header.
 */
export const ApprovalHistoryTimeline = ({ rounds, formatTime }: ApprovalHistoryTimelineProps) => {
  const t = useTranslate();
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  const toggle = useCallback(
    (round: number) =>
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(round)) next.delete(round);
        else next.add(round);
        return next;
      }),
    [],
  );

  const latest = rounds[rounds.length - 1];
  if (!latest) return null;
  const earlier = rounds.slice(0, -1);

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {earlier.map((round) => (
        <Box key={round.round}>
          <RoundHeader
            round={round.round}
            status={round.status}
            t={t}
            expanded={expanded.has(round.round)}
            onToggle={() => toggle(round.round)}
          />
          {expanded.has(round.round) ? <Steps round={round} formatTime={formatTime} t={t} /> : null}
        </Box>
      ))}

      <Box>
        {earlier.length > 0 ? (
          <RoundHeader round={latest.round} status={latest.status} t={t} />
        ) : null}
        <Steps round={latest} formatTime={formatTime} t={t} />
      </Box>
    </Box>
  );
};
