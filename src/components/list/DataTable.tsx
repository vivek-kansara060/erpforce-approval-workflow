/* eslint-disable @typescript-eslint/no-explicit-any --
 * Documented integration boundary: MaterialTable's column and row types come
 * from @erpsquad/common and are re-declared there, not here. */

import { useMemo } from 'react';
import { Box } from '@mui/material';
import { Footer, MaterialTable } from '../../ui';
import { BORDER, PAGE_GUTTER, RADIUS, SURFACE } from '../../ui/tokens';
import type { PaginationModel, SortModel } from '../../types/common';

export interface DataTableRowAction<TRow> {
  label: string;
  handleAction: (row: TRow) => void;
  disabled?: (row: TRow) => boolean;
}

export interface DataTableProps<TRow> {
  rows: TRow[];
  columns: any[];
  pagination: PaginationModel;
  isLoading: boolean;
  onPageChange: (pageNo: number) => void;
  onPageSizeChange: (limit: number) => void;
  onSortChange?: (sort: SortModel) => void;
  rowActions?: Array<DataTableRowAction<TRow>>;
  destructiveActions?: Array<DataTableRowAction<TRow>>;
  /** Resource key used by the host footer for per-resource page-size memory. */
  paginationResource?: string;
}

/**
 * Grid skin.
 *
 * Applied from the wrapper as descendant selectors rather than through
 * `MaterialTable`'s `mui*Props`: those props carry the library's own layout
 * rules (sort-label sizing, resize-handle hiding, pinned-column opacity), and
 * passing replacements would silently drop them. Colour is all this package
 * needs to change, and colour is all it changes.
 */
const gridSx = {
  '& .MuiTableCell-head': {
    bgcolor: 'theme.secondary.100',
    borderBottom: '1px solid',
    borderColor: BORDER,
    color: 'theme.secondary.800',
  },
  '& .MuiTableCell-body': {
    borderBottom: '1px solid',
    borderColor: BORDER,
    color: 'theme.secondary.900',
  },
  '& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-body': {
    bgcolor: 'theme.secondary.100',
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-body': {
    borderBottom: 'none',
  },
} as const;

const PAPER_PROPS = {
  elevation: 0,
  sx: { bgcolor: SURFACE, boxShadow: 'none', borderRadius: 0, border: 'none' },
};

/**
 * Thin binding between the package's pagination model and the ERP
 * `MaterialTable` + `Footer` pair.
 *
 * Keeps the paging arithmetic (`totalPages` from `totalCount`) in one place;
 * the original repeated it in both listing components with different rounding.
 * The pair sits inside one bordered white card, so the grid and its pager read
 * as a single object instead of bleeding into the page.
 */
export const DataTable = <TRow,>({
  rows,
  columns,
  pagination,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  rowActions,
  destructiveActions,
  paginationResource,
}: DataTableProps<TRow>) => {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.totalCount || 0) / Math.max(1, pagination.limit))),
    [pagination.totalCount, pagination.limit],
  );

  return (
    <Box sx={{ px: PAGE_GUTTER, py: 2.5, bgcolor: SURFACE }}>
      <Box
        sx={{
          ...gridSx,
          bgcolor: SURFACE,
          border: '1px solid',
          borderColor: BORDER,
          borderRadius: RADIUS.card,
          overflow: 'hidden',
        }}
      >
        <MaterialTable
          rows={rows}
          columns={columns}
          paginationModel={pagination}
          totalPages={totalPages}
          states={{ isLoading }}
          enableColumnDragging={false}
          enableEditing={false}
          enableRowActions={false}
          enableAddRow={false}
          disableAddRow
          showAddRow={false}
          hideAddRow
          isResetRow={false}
          rowActionMenu={rowActions}
          destructiveActionMenu={destructiveActions}
          onSortingChange={onSortChange}
          muiTablePaperProps={PAPER_PROPS}
        />

        <Box sx={{ borderTop: '1px solid', borderColor: BORDER, px: 1 }}>
          <Footer
            total={totalPages}
            paginationModel={pagination}
            handlePaginationModel={(model: PaginationModel) => {
              if (model.limit !== pagination.limit) onPageSizeChange(model.limit);
              else if (model.pageNo !== pagination.pageNo) onPageChange(model.pageNo);
            }}
            resource={paginationResource}
            enablePages={false}
          />
        </Box>
      </Box>
    </Box>
  );
};
