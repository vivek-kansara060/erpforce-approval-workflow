import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, IconButton, InputAdornment, TextField as MuiTextField } from '@mui/material';
import { AddIcon, CloseIcon, SearchIcon } from '../../ui/icons';
import { Button, Typography } from '../../ui';
import {
  BORDER,
  PAGE_GUTTER,
  RADIUS,
  SURFACE,
  TEXT_STRONG,
  TEXT_SUBTLE,
  searchFieldSx,
} from '../../ui/tokens';

export interface ListToolbarProps {
  title: string;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  /** Total matching records, rendered as a count pill next to the title. */
  totalCount?: number;
  onAdd?: () => void;
  addLabel?: string;
  showAdd?: boolean;
  /** Shown instead of hiding the add button when the user may not create. */
  addDisabled?: boolean;
  /** Extra controls rendered between search and the add button. */
  actions?: ReactNode;
}

/**
 * Default list header: title, record count, debounced search, primary action.
 *
 * Every view accepts a `renderToolbar` prop, so a host that wants the full ERP
 * `ActionBar` (saved views, filter builder, import/export) passes its own
 * instance wired to its page-preferences service; this is the zero-config
 * fallback for hosts that do not have one, and it is styled to match that bar:
 * `h3` title on the left, recessed search pill and contained add button on the
 * right, one hairline underneath.
 */
export const ListToolbar = ({
  title,
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  totalCount,
  onAdd,
  addLabel = 'Add',
  showAdd = true,
  addDisabled = false,
  actions,
}: ListToolbarProps) => {
  const [draft, setDraft] = useState(search);

  // Keep in sync when the search is reset externally (filter cleared, remount).
  useEffect(() => setDraft(search), [search]);

  // Debounce so typing does not issue one request per keystroke.
  useEffect(() => {
    if (draft === search) return;
    const timer = setTimeout(() => onSearchChange(draft), 350);
    return () => clearTimeout(timer);
  }, [draft, search, onSearchChange]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1.5,
        px: PAGE_GUTTER,
        py: 1.75,
        bgcolor: SURFACE,
        borderBottom: '1px solid',
        borderColor: BORDER,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        {/* Matches the ActionBar title in @erpsquad/common, so a host that
            swaps this toolbar for theirs sees no size change. */}
        <Typography type="h3" weight="medium" color={TEXT_STRONG}>
          {title}
        </Typography>

        {typeof totalCount === 'number' ? (
          <Box
            sx={{
              px: 1,
              py: 0.125,
              borderRadius: RADIUS.pill,
              border: '1px solid',
              borderColor: BORDER,
              minWidth: 26,
              textAlign: 'center',
            }}
          >
            <Typography type="s5" weight="medium" color={TEXT_SUBTLE}>
              {totalCount}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <MuiTextField
          size="small"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={searchPlaceholder}
          inputProps={{ 'aria-label': searchPlaceholder }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 0.25 }}>
                <SearchIcon fontSize="small" sx={{ color: TEXT_SUBTLE }} />
              </InputAdornment>
            ),
            endAdornment: draft ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={`Clear ${searchPlaceholder.toLowerCase()}`}
                  onClick={() => setDraft('')}
                  sx={{ color: TEXT_SUBTLE }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ ...searchFieldSx, width: { xs: '100%', sm: 260 } }}
        />

        {actions}

        {showAdd && onAdd ? (
          <Button
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={onAdd}
            disabled={addDisabled}
          >
            {addLabel}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};
