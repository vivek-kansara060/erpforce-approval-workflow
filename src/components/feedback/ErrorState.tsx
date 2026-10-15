import { Box } from '@mui/material';
import { ErrorOutlineIcon } from '../../ui/icons';
import { Button, Typography } from '../../ui';
import { TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';
import { FeedbackPanel } from './FeedbackPanel';
import { I18N } from '../../constants/i18n-keys';
import { getUserFacingErrorMessage } from '../../utils/errors';
import { useOptionalTranslate } from '../../providers/useApprovalWorkflowConfig';
import type { ApprovalWorkflowError } from '../../types/common';

export interface ErrorStateProps {
  error: ApprovalWorkflowError | Error | undefined;
  /** Shown above the message; defaults to the error's own message only. */
  title?: string;
  onRetry?: () => void;
  /** Defaults to the translated "Retry". */
  retryLabel?: string;
  minHeight?: number | string;
}

/**
 * Renders a failed request.
 *
 * The server's message is shown for client errors rather than a blanket
 * "Something went wrong", because the approvals API returns actionable text
 * (for example, that a request has already been actioned by someone else). A
 * server fault or a network failure shows the generic copy instead, so no
 * internal detail reaches the screen — see `getUserFacingErrorMessage`.
 */
export const ErrorState = ({
  error,
  title,
  onRetry,
  retryLabel,
  minHeight = 240,
}: ErrorStateProps) => {
  const t = useOptionalTranslate();

  return (
    <FeedbackPanel
      role="alert"
      tone="danger"
      icon={<ErrorOutlineIcon fontSize="medium" />}
      minHeight={minHeight}
    >
      {title ? (
        <Typography type="s2" weight="bold" color={TEXT_STRONG}>
          {title}
        </Typography>
      ) : null}

      <Typography type="s4" color={TEXT_SUBTLE} sx={{ maxWidth: 420 }}>
        {getUserFacingErrorMessage(error, t(I18N.common.somethingWentWrong))}
      </Typography>

      {onRetry ? (
        <Box mt={2.5}>
          <Button variant="outlined" onClick={onRetry}>
            {retryLabel ?? t(I18N.common.retry)}
          </Button>
        </Box>
      ) : null}
    </FeedbackPanel>
  );
};
