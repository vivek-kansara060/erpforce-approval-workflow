import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { BORDER, FILL_SUBTLE, TEXT_SUBTLE } from '../../ui/tokens';

const TONES = {
  neutral: { bgcolor: FILL_SUBTLE, borderColor: BORDER, color: TEXT_SUBTLE },
  danger: { bgcolor: 'theme.error.50', borderColor: 'theme.error.100', color: 'theme.error.600' },
} as const;

/** `compact` for empty lists and panels; `regular` for errors and denials. */
const SIZES = {
  compact: { gap: 0.75, py: 4, medallion: 48, medallionGap: 1 },
  regular: { gap: 1, py: 5, medallion: 56, medallionGap: 1.5 },
} as const;

export interface FeedbackPanelProps {
  /** Glyph in the round medallion; `null` drops the medallion. */
  icon: ReactNode | null;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  role?: 'status' | 'alert';
  minHeight: number | string;
  children: ReactNode;
}

/**
 * The centred medallion-and-message layout shared by the empty, error and
 * permission-denied states, so the three read as one family. Internal.
 */
export const FeedbackPanel = ({
  icon,
  tone = 'neutral',
  size = 'regular',
  role,
  minHeight,
  children,
}: FeedbackPanelProps) => {
  const metrics = SIZES[size];

  return (
    <Box
      role={role}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      gap={metrics.gap}
      px={3}
      py={metrics.py}
      minHeight={minHeight}
    >
      {icon === null ? null : (
        <Box
          aria-hidden
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: metrics.medallion,
            height: metrics.medallion,
            mb: metrics.medallionGap,
            borderRadius: '50%',
            border: '1px solid',
            ...TONES[tone],
          }}
        >
          {icon}
        </Box>
      )}
      {children}
    </Box>
  );
};
