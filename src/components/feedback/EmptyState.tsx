import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { InboxOutlinedIcon } from '../../ui/icons';
import { Typography } from '../../ui';
import { TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';
import { FeedbackPanel } from './FeedbackPanel';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Replaces the default tray glyph. Pass `null` to drop the medallion. */
  icon?: ReactNode;
  /** Primary call to action, e.g. an "Add a Flow" button. */
  action?: ReactNode;
  minHeight?: number | string;
}

/** Consistent empty state for lists, the dashboard and the flow section. */
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  minHeight = 260,
}: EmptyStateProps) => (
  <FeedbackPanel
    size="compact"
    icon={icon === undefined ? <InboxOutlinedIcon fontSize="medium" /> : icon}
    minHeight={minHeight}
  >
    <Typography type="s2" weight="bold" color={TEXT_STRONG}>
      {title}
    </Typography>

    {description ? (
      <Typography type="s4" color={TEXT_SUBTLE} sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    ) : null}

    {action ? <Box mt={2}>{action}</Box> : null}
  </FeedbackPanel>
);
