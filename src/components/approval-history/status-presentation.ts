import type { SvgIcon } from '@mui/material';
import { ArrowUpwardIcon as EscalatedIcon, BlockIcon as CancelledIcon, CheckIcon as ApprovedIcon, CloseIcon as RejectedIcon, HourglassEmptyOutlinedIcon as PendingIcon, InfoOutlinedIcon as OtherIcon } from '../../ui/icons';
import { toneForStatus } from '../workflow/status-tone';
import type { StatusTone } from '../workflow/status-tone';
import { I18N } from '../../constants/i18n-keys';
import type { I18nEntry } from '../../constants/i18n-keys';
import type { TranslateEntryFn } from '../../providers/useApprovalWorkflowConfig';
import type { ApprovalStatus } from '../../types/approval';

interface StatusEntry {
  /** Short label for pills: "Pending". */
  pill: I18nEntry;
  /** Headline for the summary card: "Pending approval". */
  summary: I18nEntry;
  /** Closing line of a finished round: "Request approved". */
  outcome: I18nEntry;
  Icon: typeof SvgIcon;
}

/** Keyed by status so a new `ApprovalStatus` fails to compile until it has a row. */
const STATUSES: Record<ApprovalStatus, StatusEntry> = {
  Pending: {
    pill: I18N.history.statusPending,
    summary: I18N.history.summaryPending,
    outcome: I18N.history.summaryPending,
    Icon: PendingIcon,
  },
  Approved: {
    pill: I18N.history.statusApproved,
    summary: I18N.history.summaryApproved,
    outcome: I18N.history.outcomeApproved,
    Icon: ApprovedIcon,
  },
  Rejected: {
    pill: I18N.history.statusRejected,
    summary: I18N.history.summaryRejected,
    outcome: I18N.history.outcomeRejected,
    Icon: RejectedIcon,
  },
  Cancelled: {
    pill: I18N.history.statusCancelled,
    summary: I18N.history.summaryCancelled,
    outcome: I18N.history.outcomeCancelled,
    Icon: CancelledIcon,
  },
  Escalated: {
    pill: I18N.history.statusEscalated,
    summary: I18N.history.summaryEscalated,
    outcome: I18N.history.summaryEscalated,
    Icon: EscalatedIcon,
  },
};

export interface StatusPresentation {
  pill: string;
  summary: string;
  outcome: string;
  tone: StatusTone;
  Icon: typeof SvgIcon;
}

/**
 * Labels, tone and glyph for a status. A status the package does not know is
 * shown in the server's own wording, coloured by the same substring rules as
 * the status chips.
 */
export const presentStatus = (
  status: ApprovalStatus | undefined,
  rawStatus: string | undefined,
  t: TranslateEntryFn,
): StatusPresentation => {
  if (status) {
    const entry = STATUSES[status];
    return {
      pill: t(entry.pill),
      summary: t(entry.summary),
      outcome: t(entry.outcome),
      tone: toneForStatus(status),
      Icon: entry.Icon,
    };
  }

  const raw = rawStatus ?? '';
  return { pill: raw, summary: raw, outcome: raw, tone: toneForStatus(raw), Icon: OtherIcon };
};
