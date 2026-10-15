import { withId } from '../utils/route';
import { defineModuleAdapter } from './module-registry';
import type { ApprovalModuleAdapter } from '../types/module';
import type { ApprovalRequest } from '../types/approval';

export interface EntityRouteEntry {
  /** Route template containing `:id`, e.g. `/hrms/leave-requests/view/:id`. */
  route: string;
  /** Display title, or a translation key. */
  title?: string;
}

/**
 * Builds adapters from a plain entity-type -> route map.
 *
 * This is the one-line onboarding path: a module that only needs navigation and
 * the default approve/reject flow never writes a full adapter.
 *
 * ```ts
 * const modules = createModuleRegistry(
 *   createRouteAdapters({
 *     leave_requests: { route: '/hrms/leaves/view/:id', title: 'Leave Request' },
 *     purchase_orders: { route: '/procurement/po/:id', title: 'Purchase Order' },
 *   }),
 * );
 * ```
 */
export const createRouteAdapters = (
  routeMap: Record<string, EntityRouteEntry | string>,
): ApprovalModuleAdapter[] =>
  Object.entries(routeMap).map(([entityType, entry]) => {
    const config: EntityRouteEntry = typeof entry === 'string' ? { route: entry } : entry;

    return defineModuleAdapter(entityType, {
      title: config.title,
      getRecordRoute: (request: ApprovalRequest) =>
        withId(config.route, request.entity_id ?? request.id),
    });
  });
