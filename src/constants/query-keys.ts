import type { ListQuery } from '../types/common';

/**
 * Cache keys for the internal query layer.
 *
 * Keys are hierarchical arrays so `invalidate(['workflow'])` drops every
 * workflow entry while leaving reference data (action types, operators) alone —
 * that reference data is what made the original implementation re-fetch the
 * same options on every sidebar open.
 */
export const queryKeys = {
  workflow: {
    all: ['workflow'] as const,
    list: (query: ListQuery) => ['workflow', 'list', query] as const,
    detail: (id: string) => ['workflow', 'detail', id] as const,
    history: (id: string) => ['workflow', 'history', id] as const,
  },
  approval: {
    all: ['approval'] as const,
    list: (query: ListQuery) => ['approval', 'list', query] as const,
    detail: (id: string) => ['approval', 'detail', id] as const,
    history: (id: string) => ['approval', 'history', id] as const,
    /** Every approval request raised for one record, whatever its status. */
    byEntity: (entityType: string, entityId: string) =>
      ['approval', 'byEntity', entityType, entityId] as const,
  },
  reference: {
    all: ['reference'] as const,
    /** Long-lived: action types, operators, logical operators, aggregates. */
    byType: (type: string) => ['reference', 'byType', type] as const,
    /**
     * Operators with their `data_types` metadata. Their own key: `byType` caches
     * a `{ items, totalCount }` page, and sharing `byType('operator')` let
     * whichever hook read first hand the other the wrong shape.
     */
    operators: ['reference', 'operators'] as const,
    catalogue: ['reference', 'catalogue'] as const,
    entityFields: (entityType: string) => ['reference', 'entityFields', entityType] as const,
    schemaFields: (name: string) => ['reference', 'schemaFields', name] as const,
    hierarchyLevels: (scopeKey: string) => ['reference', 'hierarchyLevels', scopeKey] as const,
    /** One merged users + employees directory per company scope and source mix. */
    approverDirectory: (scopeKey: string, withEmployees: boolean) =>
      ['reference', 'approverDirectory', scopeKey, withEmployees] as const,
    filterTable: (table: string, search: string, skip: number, limit: number) =>
      ['reference', 'filterTable', table, search, skip, limit] as const,
  },
} as const;

/**
 * Reference data changes rarely; cache it far longer than transactional data
 * so opening a sidebar ten times costs one request.
 */
export const REFERENCE_STALE_TIME = 5 * 60_000;
