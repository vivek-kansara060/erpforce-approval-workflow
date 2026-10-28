import { describe, expect, it } from 'vitest';
import { mergeApproverDirectories, pageApproverCandidates } from '../approver-directory';

const users = [
  { id: 1, first_name: 'Priya', last_name: 'Sharma' },
  { id: 2, first_name: 'P.', last_name: 'Shah' },
  { id: 3, first_name: 'Ravi', last_name: 'Kumar' },
];

describe('mergeApproverDirectories', () => {
  it('shows each user once, matched on user id', () => {
    const merged = mergeApproverDirectories(users, [
      { user_id: 1, name: 'Priya Sharma' },
      { user_id: 3, name: 'Ravi Kumar' },
    ]);

    expect(merged.map((c) => c.value).sort()).toEqual([1, 2, 3]);
  });

  it('leads with the employee name and appends the user name when they differ', () => {
    const [candidate] = mergeApproverDirectories(
      [{ id: 2, first_name: 'P.', last_name: 'Shah' }],
      [{ user_id: 2, name: 'Pooja Shah' }],
    );

    expect(candidate.label).toBe('Pooja Shah (P. Shah)');
    expect(candidate.value).toBe(2);
  });

  it('ignores case and spacing when comparing names', () => {
    const [candidate] = mergeApproverDirectories(
      [{ id: 1, first_name: 'priya', last_name: ' sharma ' }],
      [{ user_id: 1, name: 'Priya  Sharma' }],
    );

    expect(candidate.label).toBe('Priya Sharma');
  });

  it('keeps the user name for a user with no employee record', () => {
    const merged = mergeApproverDirectories(users, []);
    expect(merged.map((c) => c.label)).toEqual(['P. Shah', 'Priya Sharma', 'Ravi Kumar']);
  });

  it('keeps an employee whose user the users lookup did not return, and drops unlinked ones', () => {
    const merged = mergeApproverDirectories([], [
      { user_id: 9, name: 'Inactive Account' },
      { user_id: null, name: 'No Login' },
    ]);

    expect(merged.map((c) => c.value)).toEqual([9]);
  });

  it('finds a person by either name', () => {
    const merged = mergeApproverDirectories(
      [{ id: 2, first_name: 'P.', last_name: 'Shah' }],
      [{ user_id: 2, name: 'Pooja Shah' }],
    );

    expect(pageApproverCandidates(merged, { search: 'pooja' }).data).toHaveLength(1);
    expect(pageApproverCandidates(merged, { search: 'p. shah' }).data).toHaveLength(1);
    expect(pageApproverCandidates(merged, { search: 'zzz' }).data).toHaveLength(0);
  });
});

describe('pageApproverCandidates', () => {
  const many = mergeApproverDirectories(
    Array.from({ length: 30 }, (_, i) => ({ id: i + 1, first_name: `U${String(i).padStart(2, '0')}` })),
    [],
  );

  it('slices by skip and limit and reports the full count', () => {
    const page = pageApproverCandidates(many, { skip: 25, limit: 25 });
    expect(page.data).toHaveLength(5);
    expect(page.pagination.totalCount).toBe(30);
  });

  it('resolves saved ids directly, ignoring paging', () => {
    const page = pageApproverCandidates(many, { ids: ['3', 28], skip: 0, limit: 1 });
    expect(page.data.map((c) => c.value).sort((a, b) => a - b)).toEqual([3, 28]);
  });
});
