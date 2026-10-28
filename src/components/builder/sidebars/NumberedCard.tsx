import type { ReactNode } from 'react';
import { Box, IconButton } from '@mui/material';
import { TrashIcon } from '../../../ui';
import { BORDER, FILL_SUBTLE, RADIUS, SURFACE, dangerIconButtonSx } from '../../../ui/tokens';

export interface NumberedCardProps {
  /** Left side of the header strip, e.g. "Stage 2". */
  heading: ReactNode;
  /** Extra controls in the header strip, before the delete button. */
  actions?: ReactNode;
  /** Renders the delete button when given. */
  onRemove?: () => void;
  removeLabel?: string;
  /** Vertical gap between the body's fields. */
  bodyGap?: number;
  children: ReactNode;
}

/**
 * A bordered card with a tinted header strip and an optional delete button —
 * one action stage, or one criteria condition. Internal to the builder.
 */
export const NumberedCard = ({
  heading,
  actions,
  onRemove,
  removeLabel,
  bodyGap = 2,
  children,
}: NumberedCardProps) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: BORDER,
      borderRadius: RADIUS.card,
      bgcolor: SURFACE,
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        px: 2,
        py: 1.25,
        bgcolor: FILL_SUBTLE,
        borderBottom: '1px solid',
        borderColor: BORDER,
      }}
    >
      {heading}

      <Box display="flex" alignItems="center" gap={0.25}>
        {actions}
        {onRemove ? (
          <IconButton
            size="small"
            aria-label={removeLabel}
            onClick={onRemove}
            sx={dangerIconButtonSx}
          >
            <TrashIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>
    </Box>

    <Box px={2} py={2} display="flex" flexDirection="column" gap={bodyGap}>
      {children}
    </Box>
  </Box>
);
