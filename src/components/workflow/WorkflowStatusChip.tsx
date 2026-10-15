import { Box } from '@mui/material';
import { Chip, Typography } from '../../ui';
import { STATUS_TONES, toneForStatus } from './status-tone';
import type { StatusTone } from './status-tone';
import { I18N } from '../../constants/i18n-keys';
import { useOptionalTranslate } from '../../providers/useApprovalWorkflowConfig';

interface StatusChipProps {
  label: string;
  tone: StatusTone;
  className: string;
}

/**
 * One chip renderer for both statuses.
 *
 * A coloured dot carries the state, so the chip stays legible for users who do
 * not distinguish the fills — the previous version was a single grey pill that
 * read identically whether a workflow was live or switched off.
 */
const StatusChip = ({ label, tone, className }: StatusChipProps) => {
  const { dot, text, fill } = STATUS_TONES[tone];

  return (
    <Chip
      type="rounded"
      className={className}
      /**
       * Doubled specificity throughout.
       *
       * The ERP ships a global `.MuiChip-root` rule that hard-sets fill, text
       * colour and padding, and mounts MUI on a `prepend: true` emotion cache,
       * so a single-class `sx` is emitted above that stylesheet and loses the
       * tie — every status chip came out the same neutral grey.
       */
      sx={{
        '&&': {
          bgcolor: fill,
          color: text,
          cursor: 'default',
          px: 1,
          py: 0.375,
        },
      }}
      label={
        <Box display="flex" alignItems="center" gap={0.625}>
          <Box
            aria-hidden
            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dot, flexShrink: 0 }}
          />
          <Typography type="s5" weight="medium" color="inherit">
            {label}
          </Typography>
        </Box>
      }
    />
  );
};

export interface WorkflowStatusChipProps {
  isActive: boolean | undefined;
  activeLabel?: string;
  inactiveLabel?: string;
  /** Class prefix so the host theme can style the chip, e.g. `wf--Status--`. */
  classNamePrefix?: string;
}

/** Active / inactive chip for a workflow definition. Labels default to the translated copy. */
export const WorkflowStatusChip = ({
  isActive,
  activeLabel,
  inactiveLabel,
  classNamePrefix = 'approval-workflow--StatusChip--',
}: WorkflowStatusChipProps) => {
  const t = useOptionalTranslate();

  return (
    <StatusChip
      label={isActive ? (activeLabel ?? t(I18N.workflow.active)) : (inactiveLabel ?? t(I18N.workflow.inactive))}
      tone={isActive ? 'positive' : 'neutral'}
      className={`${classNamePrefix}${isActive ? 'Active' : 'Inactive'}`}
    />
  );
};

export interface ApprovalStatusChipProps {
  status: string | undefined;
  classNamePrefix?: string;
}

/** Pending / approved / rejected chip for an approval request. */
export const ApprovalStatusChip = ({
  status,
  classNamePrefix = 'approval-request--StatusChip--',
}: ApprovalStatusChipProps) => (
  <StatusChip
    label={status ?? '-'}
    tone={toneForStatus(String(status ?? ''))}
    className={`${classNamePrefix}${String(status ?? '').replace(/\s+/g, '')}`}
  />
);
