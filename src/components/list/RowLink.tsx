import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { ACCENT } from '../../ui/tokens';

export interface RowLinkProps {
  /**
   * Destination. Omit to render the content unlinked — an unroutable record, or
   * a user without permission to open it.
   */
  href?: string;
  /** Runs instead of the browser navigation; the host router owns the change. */
  onNavigate: () => void;
  /**
   * Colour and underline the cell as a link. Reserve it for the column that
   * identifies the row — colouring every cell leaves the row with no visual
   * entry point.
   */
  emphasis?: boolean;
  children: ReactNode;
}

/**
 * Makes a grid cell open its row's record.
 *
 * Rendered per cell rather than as a row-level click handler so the row stays a
 * real link: middle-click and ctrl-click open a tab, the status bar previews the
 * destination, and the actions column — which the grid renders itself, outside
 * these cells — cannot trigger navigation just by being clicked.
 */
export const RowLink = ({ href, onNavigate, emphasis = false, children }: RowLinkProps) => {
  if (!href) return <>{children}</>;

  return (
    <Box
      component="a"
      href={href}
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        onNavigate();
      }}
      sx={{
        // Doubled specificity: the ERP sets `.MuiTableCell-root a` (0,1,1)
        // globally, which outranks a plain `sx` on the anchor.
        '&&': {
          display: 'block',
          color: emphasis ? ACCENT : 'inherit',
          fontWeight: emphasis ? 500 : undefined,
          textDecoration: 'none',
        },
        '&&:hover': { textDecoration: emphasis ? 'underline' : 'none' },
      }}
    >
      {children}
    </Box>
  );
};
