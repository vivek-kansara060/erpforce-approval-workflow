import { ENDPOINTS } from './endpoints';
import type { HttpClient } from '../types/http';
import type { EntityCatalogueEntry, SelectOption, SelectOptionGroup } from '../types/common';
import type { OperatorReference } from '../types/criteria';
import type { DirectoryEmployee, DirectoryUser } from '../utils/approver-directory';

/** Reference item as returned by `/v1/workflow-references/:type`. */
interface RawReferenceItem {
  id: string | number;
  label: string;
  value?: string | number;
  metadata?: Record<string, unknown>;
}

interface ReferenceListEnvelope {
  data?: { items?: RawReferenceItem[] };
  pagination?: { totalCount?: number };
}

/** The reference service keys options by `id`; the ERP selects key by `value`. */
const readReferenceItems = (envelope: ReferenceListEnvelope | undefined) =>
  (envelope?.data?.items ?? []).map((item) => ({ ...item, value: item.value ?? item.id }));

interface EntityFieldRelation {
  entity_type: string;
  section_label: string;
  fields?: Array<{
    field: string;
    label: string;
    field_type?: string;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Flattens the relations payload into the grouped option shape the field picker
 * renders, prefixing each value with its entity so the criteria row can derive
 * `sub_module` from the dotted path.
 */
export const toEntityFieldGroups = (
  relations: EntityFieldRelation[] | undefined,
): Array<SelectOptionGroup<string>> =>
  (relations ?? []).map((relation) => ({
    label: relation.section_label,
    value: relation.entity_type,
    isGroup: true,
    options: (relation.fields ?? []).map((field) => ({
      ...(field.metadata ?? {}),
      label: field.label,
      value: `${relation.entity_type}.${field.field}`,
      sub_module: relation.entity_type,
      field_type: field.field_type,
    })),
  }));

/** Most rows read from each directory; the picker searches and pages them locally. */
export const APPROVER_DIRECTORY_LIMIT = 1000;

/** ERP filter string: `(a.eq=1&b.in=2,3)`. Empty arrays stay, matching the select's own lookups. */
const toFilterString = (filters: Record<string, string | number | Array<string | number>>) =>
  `(${Object.entries(filters)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`)
    .join('&')})`;

export interface ReferenceApi {
  /** Reference options for a type: `action_type`, `operator`, `logical_operator`, ... */
  byType(
    type: string,
    params?: { search?: string; skip?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ items: SelectOption[]; totalCount: number }>;
  operators(signal?: AbortSignal): Promise<OperatorReference[]>;
  entityFields(entityType: string, signal?: AbortSignal): Promise<Array<SelectOptionGroup<string>>>;
  schemaFields(name: string, signal?: AbortSignal): Promise<unknown[]>;
  /** Every entity in the module, each flagged with whether workflows may attach to it. */
  entityCatalogue(module: string, signal?: AbortSignal): Promise<EntityCatalogueEntry[]>;
  hierarchyLevels(
    scope: { company_ids?: Array<string | number>; location_ids?: Array<string | number> },
    signal?: AbortSignal,
  ): Promise<SelectOption[]>;
  /** Active users in the given companies. The fallback when employees are not readable. */
  approverUsers(companyIds: Array<string | number>, signal?: AbortSignal): Promise<DirectoryUser[]>;
  /** Employees with a linked user account in the given companies. Needs `employee` access. */
  approverEmployees(
    companyIds: Array<string | number>,
    signal?: AbortSignal,
  ): Promise<DirectoryEmployee[]>;
  /** Generic lookup used to resolve foreign-key criteria values. */
  filterTable(
    params: { table: string; search?: string; limit?: number; offset?: number },
    signal?: AbortSignal,
  ): Promise<{ items: SelectOption[]; totalCount: number }>;
}

export const createReferenceApi = (http: HttpClient): ReferenceApi => ({
  async byType(type, params, signal) {
    const envelope = await http<ReferenceListEnvelope>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.workflowReferencesByType(type),
      query: { search: params?.search, skip: params?.skip, limit: params?.limit },
      signal,
    });

    const items = readReferenceItems(envelope) as SelectOption[];

    return { items, totalCount: envelope?.pagination?.totalCount ?? items.length };
  },

  async operators(signal) {
    const envelope = await http<ReferenceListEnvelope>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.workflowReferencesByType('operator'),
      signal,
    });

    return readReferenceItems(envelope) as OperatorReference[];
  },

  async entityFields(entityType, signal) {
    const envelope = await http<{ data?: { relations?: EntityFieldRelation[] } }>({
      service: 'workflowAutomation',
      method: 'GET',
      path: ENDPOINTS.entityFieldOptions(entityType),
      signal,
    });
    return toEntityFieldGroups(envelope?.data?.relations);
  },

  async schemaFields(name, signal) {
    const envelope = await http<{ data?: { fields?: unknown[] } }>({
      service: 'systemFeature',
      method: 'GET',
      path: ENDPOINTS.schemaFields(name),
      signal,
    });
    return envelope?.data?.fields ?? [];
  },

  async entityCatalogue(module, signal) {
    const envelope = await http<{
      data?: {
        modules?: Array<{
          sub_modules?: Array<{ name: string; value: string; is_workflow_enabled?: boolean }>;
        }>;
      };
    }>({
      service: 'rbac',
      method: 'GET',
      path: ENDPOINTS.userModules,
      query: { module },
      signal,
    });

    // Only an explicit `true` opts a sub-module into workflows; a missing flag
    // means the backend has not enabled it.
    return (envelope?.data?.modules?.[0]?.sub_modules ?? []).map((subModule) => ({
      label: subModule.name,
      value: subModule.value,
      is_workflow_enabled: subModule.is_workflow_enabled === true,
    }));
  },

  async hierarchyLevels(scope, signal) {
    const envelope = await http<{ data?: { all_levels?: string[] } }>({
      service: 'organization',
      method: 'GET',
      path: ENDPOINTS.hierarchyLevels,
      query: {
        company_ids: scope.company_ids as Array<string | number> | undefined,
        location_ids: scope.location_ids as Array<string | number> | undefined,
      },
      signal,
    });

    return (envelope?.data?.all_levels ?? []).map((level) => ({ label: level, value: level }));
  },

  async approverUsers(companyIds, signal) {
    const envelope = await http<{ data?: { users?: DirectoryUser[] } }>({
      service: 'rbac',
      method: 'GET',
      path: ENDPOINTS.users,
      query: {
        select: '[id,first_name,last_name]',
        filters: toFilterString({ 'is_active.eq': 1, 'company_id.in': companyIds }),
        limit: APPROVER_DIRECTORY_LIMIT,
        skip: 0,
        order: 'id:-1',
      },
      signal,
    });
    return envelope?.data?.users ?? [];
  },

  async approverEmployees(companyIds, signal) {
    const envelope = await http<{ data?: { employees?: DirectoryEmployee[] } }>({
      service: 'hrms',
      method: 'GET',
      path: ENDPOINTS.employees,
      query: {
        select: '[id,user_id,name]',
        filters: toFilterString({ 'user_id.ne': 'null', 'company_id.in': companyIds }),
        limit: APPROVER_DIRECTORY_LIMIT,
        skip: 0,
        order: 'id:-1',
      },
      signal,
    });
    return envelope?.data?.employees ?? [];
  },

  async filterTable(params, signal) {
    const envelope = await http<{
      data?: { result?: Array<{ id: string | number; name: string }> };
      pagination?: { totalCount?: number };
    }>({
      service: 'systemFeature',
      method: 'GET',
      path: ENDPOINTS.filterTable,
      query: {
        table: params.table,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      },
      signal,
    });

    const result = envelope?.data?.result ?? [];
    return {
      items: result.map((row) => ({ label: row.name, value: row.id })),
      totalCount: envelope?.pagination?.totalCount ?? result.length,
    };
  },
});
