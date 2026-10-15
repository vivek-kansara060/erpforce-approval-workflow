import { describe, expect, it } from 'vitest';
import {
  findGroupedOption,
  flattenFieldGroups,
  findOptionByKey,
  mergeGroupedOptionPages,
  paginateGroupedOptions,
} from '../option-source';
import type { SelectOptionGroup } from '../../types/common';

const groups = (): Array<SelectOptionGroup<string>> => [
  {
    label: 'Leave Requests',
    value: 'leave_requests',
    isGroup: true,
    options: [
      { label: 'Total days', value: 'leave_requests.total_days' },
      { label: 'Reason', value: 'leave_requests.reason' },
    ],
  },
  {
    label: 'Employees',
    value: 'employees',
    isGroup: true,
    options: [
      { label: 'Grade', value: 'employees.grade' },
      { label: 'Department', value: 'employees.department' },
    ],
  },
];

describe('paginateGroupedOptions', () => {
  it('counts options across every group', () => {
    expect(paginateGroupedOptions(groups(), {}).pagination.totalCount).toBe(4);
  });

  it('slices across group boundaries', () => {
    const page = paginateGroupedOptions(groups(), { skip: 1, limit: 2 });
    const values = page.data.flatMap((group) => group.options.map((option) => option.value));

    expect(values).toEqual(['leave_requests.reason', 'employees.grade']);
  });

  it('filters by label and recounts', () => {
    const page = paginateGroupedOptions(groups(), { search: 'grade' });

    expect(page.pagination.totalCount).toBe(1);
    expect(page.data).toHaveLength(1);
    expect(page.data[0].options[0].value).toBe('employees.grade');
  });

  it('drops groups with no matching option', () => {
    expect(paginateGroupedOptions(groups(), { search: 'zzz' }).data).toHaveLength(0);
  });

  it('is pure: repeated calls with the same input give the same output', () => {
    const first = paginateGroupedOptions(groups(), { skip: 0, limit: 2 });
    const second = paginateGroupedOptions(groups(), { skip: 0, limit: 2 });

    expect(second).toEqual(first);
  });

  it('handles a missing list', () => {
    expect(paginateGroupedOptions(undefined, {})).toEqual({
      data: [],
      pagination: { totalCount: 0 },
    });
  });
});

describe('mergeGroupedOptionPages', () => {
  it('appends new options into an existing group', () => {
    const first = paginateGroupedOptions(groups(), { skip: 0, limit: 1 });
    const second = paginateGroupedOptions(groups(), { skip: 1, limit: 1 });

    const merged = mergeGroupedOptionPages(first.data, second.data);
    expect(merged).toHaveLength(1);
    expect(merged[0].options).toHaveLength(2);
  });

  it('never duplicates an option already shown', () => {
    const page = paginateGroupedOptions(groups(), { skip: 0, limit: 2 });
    const merged = mergeGroupedOptionPages(page.data, page.data);

    expect(merged[0].options).toHaveLength(2);
  });

  it('does not mutate the accumulated pages it was given', () => {
    const first = paginateGroupedOptions(groups(), { skip: 0, limit: 1 });
    const snapshot = JSON.stringify(first.data);

    mergeGroupedOptionPages(first.data, paginateGroupedOptions(groups(), { skip: 1, limit: 1 }).data);
    expect(JSON.stringify(first.data)).toBe(snapshot);
  });
});

describe('findGroupedOption', () => {
  it('finds an option in any group', () => {
    expect(findGroupedOption(groups(), 'employees.grade')?.label).toBe('Grade');
  });

  it('returns null for an unknown or empty value', () => {
    expect(findGroupedOption(groups(), 'nope')).toBeNull();
    expect(findGroupedOption(groups(), '')).toBeNull();
  });
});

describe('findOptionByKey', () => {
  it('matches on the option value', () => {
    const options = [
      { label: 'Review', value: 'review' },
      { label: 'Approval', value: 'request_approval' },
    ];

    expect(findOptionByKey(options, 'request_approval')?.value).toBe('request_approval');
  });

  it('matches on id or label when the value is keyed differently', () => {
    expect(findOptionByKey([{ label: 'X', value: 7, id: 'request_approval' }], 'request_approval')
      ?.value).toBe(7);
    expect(findOptionByKey([{ label: 'Request Approval', value: 42 }], 'request_approval')
      ?.value).toBe(42);
  });

  it('normalises spacing and hyphens on both sides', () => {
    const options = [{ label: ' Request-Approval ', value: 1 }];

    expect(findOptionByKey(options, 'Request Approval')?.value).toBe(1);
  });

  it('returns null when nothing matches, or for an empty list or key', () => {
    expect(findOptionByKey([{ label: 'Review', value: 'review' }], 'request_approval')).toBeNull();
    expect(findOptionByKey(undefined, 'request_approval')).toBeNull();
    expect(findOptionByKey([{ label: 'Review', value: 'review' }], '')).toBeNull();
  });
});

describe('flattenFieldGroups', () => {
  it('lists every option with its section as a label prefix and keeps values', () => {
    const flat = flattenFieldGroups(groups());
    const total = groups().reduce((sum, group) => sum + group.options.length, 0);
    expect(flat).toHaveLength(total);
    expect(flat[0].label.startsWith('Leave Requests / ')).toBe(true);
    expect(flat[0].value).toBe(groups()[0].options[0].value);
  });
});
