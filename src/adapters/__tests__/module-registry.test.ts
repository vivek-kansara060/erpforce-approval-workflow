import { describe, expect, it } from 'vitest';
import { createModuleRegistry, defineModuleAdapter } from '../module-registry';
import { createRouteAdapters } from '../route-adapter';

describe('createModuleRegistry', () => {
  it('returns the registered adapter for a known entity type', () => {
    const registry = createModuleRegistry([
      defineModuleAdapter('leave_requests', { title: 'Leave Request' }),
    ]);

    expect(registry.get('leave_requests').title).toBe('Leave Request');
    expect(registry.has('leave_requests')).toBe(true);
  });

  it('falls back to a generic adapter for an unknown entity type', () => {
    const registry = createModuleRegistry([defineModuleAdapter('leave_requests')]);

    expect(registry.has('purchase_orders')).toBe(false);
    expect(registry.get('purchase_orders').entityType).toBe('*');
    expect(registry.get('purchase_orders').submitDecision).toBeUndefined();
  });

  it('uses an explicit fallback adapter when one is supplied', () => {
    const fallback = defineModuleAdapter('*', { title: 'Request' });
    const registry = createModuleRegistry([], fallback);

    expect(registry.get('anything').title).toBe('Request');
  });

  it('lets a later adapter replace an earlier one with the same entity type', () => {
    const registry = createModuleRegistry([
      defineModuleAdapter('leave_requests', { title: 'Old' }),
      defineModuleAdapter('leave_requests', { title: 'New' }),
    ]);

    expect(registry.get('leave_requests').title).toBe('New');
  });

  it('extend returns a new registry and leaves the original untouched', () => {
    const base = createModuleRegistry([defineModuleAdapter('leave_requests')]);
    const extended = base.extend([defineModuleAdapter('purchase_orders')]);

    expect(extended.has('purchase_orders')).toBe(true);
    expect(base.has('purchase_orders')).toBe(false);
    expect(extended.has('leave_requests')).toBe(true);
  });

  it('lists every registered adapter', () => {
    const registry = createModuleRegistry([
      defineModuleAdapter('a'),
      defineModuleAdapter('b'),
    ]);

    expect(registry.list().map((adapter) => adapter.entityType)).toEqual(['a', 'b']);
  });
});

describe('createRouteAdapters', () => {
  it('builds navigation-only adapters from a route map', () => {
    const registry = createModuleRegistry(
      createRouteAdapters({
        leave_requests: { route: '/hrms/leaves/view/:id', title: 'Leave Request' },
        purchase_orders: '/procurement/orders/:id',
      }),
    );

    expect(
      registry.get('leave_requests').getRecordRoute?.({
        id: 'r1',
        entity_type: 'leave_requests',
        entity_id: 42,
        status: 'Pending',
      }),
    ).toBe('/hrms/leaves/view/42');

    expect(
      registry.get('purchase_orders').getRecordRoute?.({
        id: 'r2',
        entity_type: 'purchase_orders',
        entity_id: 'PO-7',
        status: 'Pending',
      }),
    ).toBe('/procurement/orders/PO-7');
  });

  it('falls back to the approval id when the record has no entity_id', () => {
    const [adapter] = createRouteAdapters({ x: '/x/:id' });

    expect(
      adapter.getRecordRoute?.({
        id: 'req-1',
        entity_type: 'x',
        entity_id: undefined as never,
        status: 'Pending',
      }),
    ).toBe('/x/req-1');
  });
});
