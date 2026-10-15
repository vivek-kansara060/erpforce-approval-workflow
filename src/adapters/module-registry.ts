import type { ApprovalModuleAdapter, ModuleRegistry } from '../types/module';

/**
 * Entity type used when no adapter matches. The generic adapter registered
 * under this key drives the default approve/reject flow.
 */
export const FALLBACK_ENTITY_TYPE = '*';

/**
 * Builds an immutable adapter lookup.
 *
 * This replaces the `approvalMapper` object in the original dashboard, which
 * statically imported a modal component and a Redux thunk from ten different
 * HRMS feature folders. Because those imports were top-level, opening the
 * approval dashboard pulled in leave, recruitment, payroll, loans, assets,
 * resignation and resource-allocation code whether or not the user had a single
 * request of that type. Adapters are now supplied by the host, so the package
 * has no knowledge of — and no import edge to — any specific module.
 */
export const createModuleRegistry = (
  adapters: ApprovalModuleAdapter[] = [],
  fallback?: ApprovalModuleAdapter,
): ModuleRegistry => {
  const byEntityType = new Map<string, ApprovalModuleAdapter>();

  for (const adapter of adapters) {
    byEntityType.set(adapter.entityType, adapter);
  }

  const defaultAdapter: ApprovalModuleAdapter =
    fallback ??
    byEntityType.get(FALLBACK_ENTITY_TYPE) ?? { entityType: FALLBACK_ENTITY_TYPE };

  const registry: ModuleRegistry = {
    get: (entityType) => byEntityType.get(entityType) ?? defaultAdapter,
    has: (entityType) => byEntityType.has(entityType),
    list: () => [...byEntityType.values()],
    extend: (extra) => createModuleRegistry([...byEntityType.values(), ...extra], defaultAdapter),
  };

  return registry;
};

/**
 * Convenience for the common case: one entity type, one route, everything else
 * default.
 *
 * ```ts
 * defineModuleAdapter('leave_requests', {
 *   title: 'Leave Request',
 *   getRecordRoute: (request) => `/hrms/leaves/${request.entity_id}`,
 * })
 * ```
 */
export const defineModuleAdapter = (
  entityType: string,
  adapter: Omit<ApprovalModuleAdapter, 'entityType'> = {},
): ApprovalModuleAdapter => ({ entityType, ...adapter });
