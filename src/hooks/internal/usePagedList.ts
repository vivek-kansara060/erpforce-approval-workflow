import { useCallback, useMemo } from 'react';
import { useCachedQuery } from './useCachedQuery';
import { useListState } from '../useListState';
import { buildListQuery } from '../../utils/filters';
import type { ApprovalTableColumn } from '../../constants/columns';
import type { ListQuery, ListResult } from '../../types/common';

const EMPTY_ROWS: never[] = [];

export interface UsePagedListInput<TRow> {
  resource: string;
  columns: ApprovalTableColumn[];
  /** Fields always projected, whatever columns are visible. */
  requiredFields: readonly string[];
  /** The view's own filter fragment, e.g. "my pending approvals". */
  viewFilter: string | undefined;
  includeAuditFields?: boolean;
  queryKey: (query: ListQuery) => readonly unknown[];
  fetchPage: (query: ListQuery, signal: AbortSignal) => Promise<ListResult<TRow>>;
}

/**
 * List state -> gateway query -> cached page, plus the paging setters. Internal.
 *
 * The workflow list and the approval queue are the same machine over different
 * endpoints; this is that machine, written once. Search and page-size changes
 * go back to the first page so the user never lands on an empty page 7.
 */
export const usePagedList = <TRow>({
  resource,
  columns,
  requiredFields,
  viewFilter,
  includeAuditFields,
  queryKey,
  fetchPage,
}: UsePagedListInput<TRow>) => {
  const listState = useListState(resource, columns);
  const { pagination, search, sort, visibleColumns, filterQueryString, update } = listState;

  const query = useMemo<ListQuery>(
    () =>
      buildListQuery({
        skip: pagination.limit * (pagination.pageNo - 1),
        limit: pagination.limit,
        search,
        sort,
        visibleColumns,
        requiredFields,
        hostFilterQuery: filterQueryString,
        viewFilter,
        includeAuditFields,
      }),
    [
      pagination.limit,
      pagination.pageNo,
      search,
      sort,
      visibleColumns,
      requiredFields,
      filterQueryString,
      viewFilter,
      includeAuditFields,
    ],
  );

  const result = useCachedQuery<ListResult<TRow>>(queryKey(query), (signal) =>
    fetchPage(query, signal),
  );

  const setPage = useCallback(
    (pageNo: number) => update({ pagination: { ...pagination, pageNo } }),
    [update, pagination],
  );

  const setPageSize = useCallback(
    (limit: number) => update({ pageSize: limit, pagination: { ...pagination, limit, pageNo: 1 } }),
    [update, pagination],
  );

  const setSearch = useCallback(
    (nextSearch: string) =>
      update({ search: nextSearch, pagination: { ...pagination, pageNo: 1 } }),
    [update, pagination],
  );

  return {
    rows: (result.data?.items ?? EMPTY_ROWS) as TRow[],
    totalCount: result.data?.totalCount ?? 0,
    isLoading: result.isLoading,
    isRefetching: result.isRefetching,
    error: result.error,
    refetch: result.refetch,
    listState,
    setPage,
    setPageSize,
    setSearch,
  };
};
