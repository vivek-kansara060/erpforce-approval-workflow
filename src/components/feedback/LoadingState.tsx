import { Box, CircularProgress } from '@mui/material';
import { Typography } from '../../ui';

export interface LoadingStateProps {
  /** `page` fills the viewport section; `inline` fits inside a card or panel. */
  variant?: 'page' | 'inline';
  label?: string;
  minHeight?: number | string;
}

/**
 * The single loading affordance for the package.
 *
 * The original mixed `ErpLoader`, `FormLoader`, a bare `CircularProgress` and
 * three different `Suspense` fallbacks across five screens.
 */
export const LoadingState = ({
  variant = 'inline',
  label,
  minHeight,
}: LoadingStateProps) => (
  <Box
    role="status"
    aria-live="polite"
    aria-busy="true"
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    gap={1.5}
    width="100%"
    minHeight={minHeight ?? (variant === 'page' ? '60vh' : 200)}
  >
    <CircularProgress size={variant === 'page' ? 40 : 28} />
    {label ? (
      <Typography type="s4" color="theme.secondary.600">
        {label}
      </Typography>
    ) : null}
  </Box>
);
