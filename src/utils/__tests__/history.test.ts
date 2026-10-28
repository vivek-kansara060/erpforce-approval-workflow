import { describe, expect, it } from 'vitest';
import { describeChanges } from '../history';
import type { WorkflowHistoryEntry } from '../../types/workflow';

const entry = (overrides: Partial<WorkflowHistoryEntry>): WorkflowHistoryEntry => ({
  id: 'h1',
  action: 'update',
  user_id: '7',
  user_name: 'Ann Park',
  previous: null,
  updated: null,
  created_at: '2026-10-16T10:00:00Z',
  ...overrides,
});

describe('describeChanges', () => {
  it('pairs the before and after of each changed field', () => {
    expect(
      describeChanges(entry({ previous: { name: 'Old' }, updated: { name: 'New' } })),
    ).toEqual([{ field: 'name', from: 'Old', to: 'New' }]);
  });

  it('keeps a falsy value: switching a workflow off is a change, not an absence', () => {
    expect(
      describeChanges(entry({ previous: { is_active: true }, updated: { is_active: false } })),
    ).toEqual([{ field: 'is_active', from: true, to: false }]);
  });

  it('gives a creation only an "after", and a deletion only a "before"', () => {
    expect(describeChanges(entry({ action: 'create', updated: { name: 'A' } }))).toEqual([
      { field: 'name', to: 'A' },
    ]);
    expect(describeChanges(entry({ action: 'delete', previous: { name: 'A' } }))).toEqual([
      { field: 'name', from: 'A' },
    ]);
  });

  it('lists fields in a stable, readable order', () => {
    const lines = describeChanges(
      entry({
        previous: { graph: {}, company_ids: [], status: 'draft', name: 'a' },
        updated: { graph: {}, company_ids: [1], status: 'published', name: 'b' },
      }),
    );
    expect(lines.map((line) => line.field)).toEqual(['name', 'status', 'company_ids', 'graph']);
  });

  it('copes with a row that has nothing recorded', () => {
    expect(describeChanges(entry({}))).toEqual([]);
  });
});
