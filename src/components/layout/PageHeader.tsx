import type { ReactNode } from 'react';
import { Box, IconButton } from '@mui/material';
import { ArrowBackIcon } from '../../ui/icons';
import { Typography } from '../../ui';
import {
  BORDER,
  PAGE_GUTTER,
  RADIUS,
  SURFACE,
  TEXT_STRONG,
  TEXT_SUBTLE,
} from '../../ui/tokens';

export interface PageHeaderProps {
  title: ReactNode;
  /** One line of context under the title, e.g. the record's category. */
  subtitle?: ReactNode;
  /** Rendered immediately after the title, e.g. a status chip. */
  adornment?: ReactNode;
  /** Right-hand action cluster. */
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** Pin to the top of the scroll container. @default true */
  sticky?: boolean;
}

/**
 * The one header bar for every screen in the package.
 *
 * Title on the left, actions on the right, a single hairline underneath, and
 * the same gutter the body uses so nothing is off by a few pixels. Every screen
 * previously hand-rolled this `Box` with slightly different padding and
 * typography.
 */
export const PageHeader = ({
  title,
  subtitle,
  adornment,
  actions,
  onBack,
  backLabel = 'Back',
  sticky = true,
}: PageHeaderProps) => (
  <Box
    component="header"
    sx={{
      position: sticky ? 'sticky' : 'static',
      top: 0,
      zIndex: 3,
      bgcolor: SURFACE,
      borderBottom: '1px solid',
      borderColor: BORDER,
      px: PAGE_GUTTER,
      // Deliberately tight. The host already stacks an app bar and a breadcrumb
      // bar above this one, and every pixel here comes off the form or the
      // canvas below it.
      py: 1.25,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 1.5,
      flexShrink: 0,
    }}
  >
    <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
      {onBack ? (
        <IconButton
          size="small"
          aria-label={backLabel}
          onClick={onBack}
          sx={{
            border: '1px solid',
            borderColor: BORDER,
            borderRadius: RADIUS.control,
            color: TEXT_SUBTLE,
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      ) : null}

      <Box minWidth={0}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {/* `h4` rather than the ActionBar's `h3`: this header sits under two
              host bars, and on a form screen the extra 2px of title were coming
              straight out of the content below the fold. */}
          <Typography type="h4" weight="bold" color={TEXT_STRONG} noWrap>
            {title}
          </Typography>
          {adornment}
        </Box>
        {subtitle ? (
          <Typography type="s5" color={TEXT_SUBTLE}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>

    {actions ? (
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        {actions}
      </Box>
    ) : null}
  </Box>
);
