import { useCallback, useMemo, useRef, useState } from 'react';
import { useApprovalWorkflowConfig } from '../providers/useApprovalWorkflowConfig';
import { ApprovalWorkflowError } from '../types/common';
import type { ListState } from '../types/config';
import type { PaginationModel, SortModel } from '../types/common';
import type { ApprovalTableColumn } from '../constants/columns';

interface InternalState {
  search: string;
  sort: SortModel | null;
  pagination: PaginationModel;
  filterQueryString: string;
  visibleColumns: ApprovalTableColumn[];
  activeView: string;
  pageSize: number;
}

/**
 * List/table state for one resource.
 *
 * When the host supplies `config.listState` (typically a binding to
 * `usePages()` from @erpsquad/common) its saved views, column preferences and
 * page size are used. Otherwise the state is local to the view — which is what
 * makes the package usable in an app that has no page-preference service at all.
 *
 * Invariant: `config.listState` must be present-or-absent for the whole life of
 * a provider. Swapping it at runtime would change the hook call order; the dev
 * build asserts this rather than failing silently.
 */
export const useListState = (
  resource: string,
  defaultColumns: ApprovalTableColumn[],
): ListState => {
  const config = useApprovalWorkflowConfig();
  const adapter = config.listState;

  const hadAdapterRef = useRef<boolean>(Boolean(adapter));
  if (hadAdapterRef.current !== Boolean(adapter)) {
    // Failing loudly beats the silent hook-order corruption this would cause.
    throw new ApprovalWorkflowError(
      '`config.listState` was added or removed after mount. ' +
        'It must be stable for the lifetime of ApprovalWorkflowProvider.',
      { code: 'invalid-config' },
    );
  }

  const [internal, setInternal] = useState<InternalState>(() => ({
    search: '',
    sort: null,
    pagination: { pageNo: 1, limit: config.defaultPageSize, totalCount: 0 },
    filterQueryString: '',
    visibleColumns: defaultColumns,
    activeView: 'Table',
    pageSize: config.defaultPageSize,
  }));

  const updateInternal = useCallback((updates: Partial<ListState>) => {
    setInternal((previous) => ({
      ...previous,
      ...(updates.search !== undefined ? { search: updates.search } : {}),
      ...(updates.sort !== undefined ? { sort: updates.sort } : {}),
      ...(updates.filterQueryString !== undefined
        ? { filterQueryString: updates.filterQueryString }
        : {}),
      ...(updates.activeView !== undefined ? { activeView: updates.activeView } : {}),
      ...(updates.pageSize !== undefined ? { pageSize: updates.pageSize } : {}),
      ...(updates.visibleColumns !== undefined
        ? { visibleColumns: updates.visibleColumns as ApprovalTableColumn[] }
        : {}),
      ...(updates.pagination !== undefined
        ? { pagination: { ...previous.pagination, ...updates.pagination } }
        : {}),
    }));
  }, []);

  const localState = useMemo<ListState>(
    () => ({
      search: internal.search,
      sort: internal.sort,
      pagination: internal.pagination,
      filterQueryString: internal.filterQueryString,
      visibleColumns: internal.visibleColumns,
      activeView: internal.activeView,
      pageSize: internal.pageSize,
      isLoading: false,
      update: updateInternal,
    }),
    [internal, updateInternal],
  );

  // Guarded by the invariant above: presence of `adapter` never changes.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hostState = adapter ? adapter.useListState(resource) : undefined;

  return useMemo<ListState>(() => {
    if (!hostState) return localState;
    return {
      ...hostState,
      // The host may not know this resource's columns yet; fall back to ours so
      // the projection sent to the API is never empty.
      visibleColumns:
        hostState.visibleColumns && hostState.visibleColumns.length > 0
          ? hostState.visibleColumns
          : defaultColumns,
    };
  }, [hostState, localState, defaultColumns]);
};
