import { useCallback, useMemo } from 'react';
import { useCachedQuery } from './internal/useCachedQuery';
import { queryKeys, REFERENCE_STALE_TIME } from '../constants/query-keys';
import {
  useApprovalWorkflowApi,
  useApprovalWorkflowConfig,
} from '../providers/useApprovalWorkflowConfig';
import type { EntityCatalogueEntry, SelectOption, SelectOptionGroup } from '../types/common';
import type { OperatorReference } from '../types/criteria';

const EMPTY_OPTIONS: SelectOption[] = [];
const EMPTY_ENTRIES: EntityCatalogueEntry[] = [];
const EMPTY_GROUPS: Array<SelectOptionGroup<string>> = [];
const EMPTY_OPERATORS: OperatorReference[] = [];
const EMPTY_FIELDS: unknown[] = [];

/**
 * Reference options for one type (`action_type`, `aggregate_function`,
 * `logical_operator`, ...).
 *
 * These lists are effectively static, so they are cached for five minutes and
 * shared across every mounted sidebar. The original fetched `action_type` on
 * the list screen, again on the detail screen, again in the form, and once more
 * on every action-sidebar open.
 */
export const useReferenceOptions = (type: string, options?: { enabled?: boolean }) => {
  const { reference } = useApprovalWorkflowApi();

  const query = useCachedQuery(
    queryKeys.reference.byType(type),
    (signal) => reference.byType(type, { limit: 200 }, signal),
    { enabled: options?.enabled ?? true, staleTime: REFERENCE_STALE_TIME },
  );

  return { ...query, options: query.data?.items ?? EMPTY_OPTIONS };
};

/** Operators, with their `data_types` metadata for field-aware filtering. */
export const useOperators = (options?: { enabled?: boolean }) => {
  const { reference } = useApprovalWorkflowApi();

  const query = useCachedQuery<OperatorReference[]>(
    queryKeys.reference.operators,
    (signal) => reference.operators(signal),
    { enabled: options?.enabled ?? true, staleTime: REFERENCE_STALE_TIME },
  );

  return { ...query, operators: query.data ?? EMPTY_OPERATORS };
};

/**
 * The catalogue of entities a workflow can be attached to.
 *
 * Served from `config.entityCatalogue` when the host already knows it, which
 * removes the `/v1/user/modules` round trip and the `localStorage` cache the
 * original `UserModulesProvider` maintained.
 *
 * `catalogue` lists only entities with `is_workflow_enabled`, so pickers never
 * offer a disabled request category. Pass `selectedValue` to keep an already
 * chosen entity in the list after it has been disabled, so editing an existing
 * workflow does not blank the field. `labelOf` resolves against every entity.
 */
export const useEntityCatalogue = (options?: { selectedValue?: string }) => {
  const { reference } = useApprovalWorkflowApi();
  const { entityCatalogue, moduleContext } = useApprovalWorkflowConfig();

  const query = useCachedQuery(
    queryKeys.reference.catalogue,
    (signal) => reference.entityCatalogue(moduleContext.module, signal),
    { enabled: !entityCatalogue, staleTime: REFERENCE_STALE_TIME },
  );

  const entries = entityCatalogue ?? query.data ?? EMPTY_ENTRIES;
  const selectedValue = options?.selectedValue;

  const catalogue = useMemo(
    () =>
      entries.filter(
        (entry) => entry.is_workflow_enabled !== false || entry.value === selectedValue,
      ),
    [entries, selectedValue],
  );

  // `labelOf` runs once per table cell; a map keeps that O(1).
  const labels = useMemo(() => {
    const map = new Map<string | number, string>();
    // First entry wins, as the linear `find` it replaces did.
    for (const entry of entries) if (!map.has(entry.value)) map.set(entry.value, entry.label);
    return map;
  }, [entries]);

  const labelOf = useCallback(
    (value: string | undefined) => (value === undefined ? '' : (labels.get(value) ?? value)),
    [labels],
  );

  return {
    ...query,
    isLoading: entityCatalogue ? false : query.isLoading,
    catalogue,
    labelOf,
  };
};

/** Selectable fields for the criteria builder, grouped by related entity. */
export const useEntityFields = (entityType: string | undefined) => {
  const { reference } = useApprovalWorkflowApi();

  const query = useCachedQuery(
    queryKeys.reference.entityFields(entityType ?? ''),
    (signal) => reference.entityFields(entityType as string, signal),
    { enabled: Boolean(entityType), staleTime: REFERENCE_STALE_TIME },
  );

  return { ...query, groups: query.data ?? EMPTY_GROUPS };
};

/** Mongo schema fields, used by the host's filter builder in the action bar. */
export const useSchemaFields = (name: string) => {
  const { reference } = useApprovalWorkflowApi();

  const query = useCachedQuery(
    queryKeys.reference.schemaFields(name),
    (signal) => reference.schemaFields(name, signal),
    { staleTime: REFERENCE_STALE_TIME },
  );

  return { ...query, fields: query.data ?? EMPTY_FIELDS };
};

/** Hierarchy levels available for the selected company/location scope. */
export const useHierarchyLevels = (
  scope: {
    company_ids?: Array<string | number>;
    location_ids?: Array<string | number>;
  },
  options?: { enabled?: boolean },
) => {
  const { reference } = useApprovalWorkflowApi();

  const companyIds = scope.company_ids;
  const locationIds = scope.location_ids;

  // Scope arrays are recreated by react-hook-form on every render; the cache
  // keys by value, so identical scopes reuse the cached response.
  const normalizedScope = useMemo(
    () => ({ company_ids: companyIds ?? [], location_ids: locationIds ?? [] }),
    [companyIds, locationIds],
  );

  const query = useCachedQuery(
    queryKeys.reference.hierarchyLevels(JSON.stringify(normalizedScope)),
    (signal) => reference.hierarchyLevels(normalizedScope, signal),
    { enabled: options?.enabled ?? true, staleTime: REFERENCE_STALE_TIME },
  );

  return { ...query, levels: query.data ?? EMPTY_OPTIONS };
};
