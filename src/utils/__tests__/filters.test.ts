import { describe, expect, it } from 'vitest';
import {
  buildApprovalFilter,
  buildListQuery,
  buildWorkflowFilter,
  combineFilters,
} from '../filters';

describe('buildListQuery', () => {
  const base = { skip: 0, limit: 10 };

  it('projects only the visible columns', () => {
    const query = buildListQuery({
      ...base,
      visibleColumns: [
        { accessorKey: 'name', visible: true },
        { accessorKey: 'status', visible: false },
      ],
      includeAuditFields: false,
    });

    expect(query.select).toBe('[name]');
  });

  it('projects the root of a dotted accessor', () => {
    const query = buildListQuery({
      ...base,
      visibleColumns: [{ accessorKey: 'approver_data.name', visible: true }],
      includeAuditFields: false,
    });

    expect(query.select).toBe('[approver_data]');
  });

  it('never projects the rendered-only action column', () => {
    const query = buildListQuery({
      ...base,
      visibleColumns: [
        { accessorKey: 'action', visible: true },
        { accessorKey: 'status', visible: true },
      ],
      includeAuditFields: false,
    });

    expect(query.select).toBe('[status]');
  });

  it('always includes the required fields even when their column is hidden', () => {
    const query = buildListQuery({
      ...base,
      visibleColumns: [{ accessorKey: 'status', visible: true }],
      requiredFields: ['entity_id', 'entity_type'],
      includeAuditFields: false,
    });

    expect(query.select).toBe('[status,entity_id,entity_type]');
  });

  it('de-duplicates fields', () => {
    const query = buildListQuery({
      ...base,
      visibleColumns: [{ accessorKey: 'entity_id', visible: true }],
      requiredFields: ['entity_id'],
      includeAuditFields: false,
    });

    expect(query.select).toBe('[entity_id]');
  });

  it('adds the audit fields when asked', () => {
    const query = buildListQuery({
      ...base,
      visibleColumns: [{ accessorKey: 'name', visible: true }],
    });

    expect(query.select).toContain('created_at');
    expect(query.select).toContain('created_by_data');
  });

  it('encodes sort direction', () => {
    expect(buildListQuery({ ...base, sort: { id: 'created_at', desc: true } }).order).toBe(
      'created_at:-1',
    );
    expect(buildListQuery({ ...base, sort: { id: 'created_at', desc: false } }).order).toBe(
      'created_at:1',
    );
  });

  it('omits empty optional keys rather than sending undefined', () => {
    const query = buildListQuery(base);
    expect(query).not.toHaveProperty('search');
    expect(query).not.toHaveProperty('order');
    expect(query).not.toHaveProperty('filters');
  });
});

describe('combineFilters', () => {
  it('merges the view filter with the host filter builder output', () => {
    expect(combineFilters("status.eq=Pending", "(a.eq='1' and b.eq='2')")).toBe(
      "(status.eq=Pending&a.eq='1' and b.eq='2')",
    );
  });

  it('wraps a lone view filter', () => {
    expect(combineFilters('status.eq=Pending', undefined)).toBe('(status.eq=Pending)');
  });

  it('wraps a lone host filter', () => {
    expect(combineFilters(undefined, "(a.eq='1')")).toBe("(a.eq='1')");
  });

  it('returns undefined when there is nothing to filter on', () => {
    expect(combineFilters(undefined, undefined)).toBeUndefined();
    expect(combineFilters('', '')).toBeUndefined();
  });
});

describe('buildApprovalFilter', () => {
  it('builds the default "my pending approvals" filter', () => {
    expect(buildApprovalFilter({ status: 'Pending', approverId: 12 })).toBe(
      'status.eq=Pending&approver_id.eq=12',
    );
  });

  it('uses `in` for multiple statuses', () => {
    expect(buildApprovalFilter({ status: ['Pending', 'Escalated'] })).toBe(
      'status.in=Pending,Escalated',
    );
  });

  it('appends a raw fragment supplied by the host', () => {
    expect(buildApprovalFilter({ entityType: 'leave_requests', raw: 'priority.eq=high' })).toBe(
      'entity_type.eq=leave_requests&priority.eq=high',
    );
  });

  it('returns undefined for an empty filter set', () => {
    expect(buildApprovalFilter({})).toBeUndefined();
  });
});

describe('buildWorkflowFilter', () => {
  it('scopes to a module and entity type', () => {
    expect(buildWorkflowFilter({ module: 'hrms', entityType: 'leave_requests' })).toBe(
      'module.eq=hrms&entity_type.eq=leave_requests',
    );
  });

  it('includes is_active when it is explicitly false', () => {
    expect(buildWorkflowFilter({ isActive: false })).toBe('is_active.eq=false');
  });
});
