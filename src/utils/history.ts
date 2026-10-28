import type { WorkflowHistoryEntry } from '../types/workflow';

export interface ChangeLine {
  field: string;
  /** Absent for a row that only has an "after", such as a creation. */
  from?: unknown;
  to?: unknown;
}

/** The order changes are listed in; anything else follows alphabetically. */
const FIELD_ORDER = [
  'name',
  'description',
  'entity_type',
  'request_type',
  'status',
  'is_active',
  'company_ids',
  'location_ids',
  'department_ids',
  'grade_ids',
  'employment_type_ids',
  'graph',
];

const rank = (field: string) => {
  const index = FIELD_ORDER.indexOf(field);
  return index === -1 ? FIELD_ORDER.length : index;
};

/**
 * What one history row says changed, field by field.
 *
 * The server stores only the fields that changed, before and after, so a line is
 * simply a key present on either side. Values are returned raw: how a boolean or
 * a list of ids reads on screen is the component's job, since that is where the
 * translations live.
 */
export const describeChanges = (entry: WorkflowHistoryEntry): ChangeLine[] => {
  const before = entry.previous ?? {};
  const after = entry.updated ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return fields
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((field) => ({
      field,
      ...(field in before ? { from: before[field] } : null),
      ...(field in after ? { to: after[field] } : null),
    }));
};
