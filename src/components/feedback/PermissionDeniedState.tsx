import { LockOutlinedIcon } from '../../ui/icons';
import { Typography } from '../../ui';
import { TEXT_SUBTLE } from '../../ui/tokens';
import { FeedbackPanel } from './FeedbackPanel';
import { I18N } from '../../constants/i18n-keys';
import { useOptionalTranslate } from '../../providers/useApprovalWorkflowConfig';

export interface PermissionDeniedStateProps {
  /** Defaults to the translated "You do not have permission to view this." */
  message?: string;
  minHeight?: number | string;
}

/** Shown by `PermissionGate` when a capability is denied. */
export const PermissionDeniedState = ({ message, minHeight = 240 }: PermissionDeniedStateProps) => {
  const t = useOptionalTranslate();

  return (
    <FeedbackPanel
      role="status"
      icon={<LockOutlinedIcon fontSize="medium" />}
      minHeight={minHeight}
    >
      <Typography type="s4" color={TEXT_SUBTLE} sx={{ maxWidth: 420 }}>
        {message ?? t(I18N.common.permissionDenied)}
      </Typography>
    </FeedbackPanel>
  );
};
