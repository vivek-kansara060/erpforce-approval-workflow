import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { PAGE_GUTTER, SURFACE } from '../../ui/tokens';

export interface PageShellProps {
  children: ReactNode;
  /** Cap the content width so forms do not stretch on ultra-wide screens. */
  maxWidth?: number | string;
  /** Drop the gutter and vertical rhythm, e.g. for a full-bleed canvas. */
  bare?: boolean;
}

/**
 * White page body with the standard gutter and a consistent vertical rhythm
 * between its section cards.
 */
export const PageShell = ({ children, maxWidth, bare = false }: PageShellProps) => (
  <Box
    sx={{
      bgcolor: SURFACE,
      minHeight: bare ? undefined : '60vh',
      ...(bare
        ? {}
        : {
            px: PAGE_GUTTER,
            py: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }),
    }}
  >
    {maxWidth && !bare ? (
      <Box width="100%" maxWidth={maxWidth} display="flex" flexDirection="column" gap={2}>
        {children}
      </Box>
    ) : (
      children
    )}
  </Box>
);
