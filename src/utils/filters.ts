import type { ListQuery, SortModel } from '../types/common';
import type { ApprovalDashboardFilters } from '../types/approval';
import type { WorkflowListFilters } from '../types/workflow';

export interface BuildListQueryInput {
  skip: number;
  limit: number;
  search?: string;
  sort?: SortModel | null;
  /** Columns currently visible; drives the `select` projection. */
  visibleColumns?: Array<{ accessorKey: string; visible: boolean }>;
  /** Fields always fetched regardless of column visibility. */
  requiredFields?: readonly string[];
  /** Filter fragment produced by the host's filter builder, e.g. `(status.eq='x')`. */
  hostFilterQuery?: string;
  /** Filter fragment owned by the view, e.g. `approver_id.eq=12`. */
  viewFilter?: string;
  /** Include `created_at` / `created_by_data` in the projection. */
  includeAuditFields?: boolean;
}

/**
 * Builds the gateway query from list state.
 *
 * This replaces the three near-identical `useDataFetcher` copies in the original
 * code. It is a pure function, so the "did anything actually change?" check that
 * prevents duplicate requests can live in the cache layer instead of a ref.
 */
export const buildListQuery = (input: BuildListQueryInput): ListQuery => {
  const {
    skip,
    limit,
    search,
    sort,
    visibleColumns,
    requiredFields = [],
    hostFilterQuery,
    viewFilter,
    includeAuditFields = true,
  } = input;

  const selectFields = new Set<string>();

  for (const column of visibleColumns ?? []) {
    if (!column.visible) continue;
    // `approver_data.name` projects as `approver_data`.
    const root = column.accessorKey?.includes('.')
      ? column.accessorKey.split('.')[0]
      : column.accessorKey;
    // `action` is a rendered-only column with no backing field.
    if (root && root !== 'action') selectFields.add(root);
  }

  if (includeAuditFields) {
    selectFields.add('created_at');
    selectFields.add('created_by_data');
  }

  for (const field of requiredFields) {
    if (field) selectFields.add(field);
  }

  const filters = combineFilters(viewFilter, hostFilterQuery);

  return {
    skip,
    limit,
    ...(search ? { search } : {}),
    ...(selectFields.size > 0 ? { select: `[${[...selectFields].join(',')}]` } : {}),
    ...(sort ? { order: `${sort.id}:${sort.desc ? -1 : 1}` } : {}),
    ...(filters ? { filters } : {}),
  };
};

/**
 * Joins the view's own filter with the host filter-builder output.
 *
 * The host produces `(a.eq='1' and b.eq='2')`; the parentheses are stripped and
 * the fragments re-wrapped so the result is always a single valid group.
 */
export const combineFilters = (
  viewFilter: string | undefined,
  hostFilterQuery: string | undefined,
): string | undefined => {
  const hostFragment = hostFilterQuery?.replace(/[()]/g, '').trim();
  const viewFragment = viewFilter?.trim();

  if (viewFragment && hostFragment) return `(${viewFragment}&${hostFragment})`;
  if (viewFragment) return `(${viewFragment})`;
  if (hostFragment) return `(${hostFragment})`;
  return undefined;
};

/** Turns typed dashboard filters into the gateway's filter fragment. */
export const buildApprovalFilter = (filters: ApprovalDashboardFilters): string | undefined => {
  const parts: string[] = [];

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    if (statuses.length === 1) parts.push(`status.eq=${statuses[0]}`);
    else if (statuses.length > 1) parts.push(`status.in=${statuses.join(',')}`);
  }
  if (filters.entityType) parts.push(`entity_type.eq=${filters.entityType}`);
  if (filters.approverId !== undefined) parts.push(`approver_id.eq=${filters.approverId}`);
  if (filters.module) parts.push(`module.eq=${filters.module}`);
  if (filters.raw) parts.push(filters.raw);

  return parts.length ? parts.join('&') : undefined;
};

/** Turns typed workflow-list filters into the gateway's filter fragment. */
export const buildWorkflowFilter = (filters: WorkflowListFilters): string | undefined => {
  const parts: string[] = [];
  if (filters.module) parts.push(`module.eq=${filters.module}`);
  if (filters.entityType) parts.push(`entity_type.eq=${filters.entityType}`);
  if (filters.isActive !== undefined) parts.push(`is_active.eq=${filters.isActive}`);
  return parts.length ? parts.join('&') : undefined;
};
