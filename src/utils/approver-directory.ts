import type { SelectOption } from '../types/common';

/** A user as returned by the users lookup, reduced to what the picker needs. */
export interface DirectoryUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
}

/** An employee as returned by the employees lookup. */
export interface DirectoryEmployee {
  user_id?: number | null;
  name?: string | null;
}

/** One approver candidate, keyed by the *user* id a workflow stores. */
export interface ApproverCandidate extends SelectOption<number> {
  id: number;
  /** Lower-cased names from both sources, so search hits either. */
  searchText: string;
}

export interface ApproverPageQuery {
  search?: string;
  skip?: number;
  limit?: number;
  /** User ids to resolve directly, as the select does for already-saved values. */
  ids?: Array<number | string>;
}

const normalise = (name: string | null | undefined) =>
  (name ?? '').replace(/\s+/g, ' ').trim();

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const userName = (user: DirectoryUser) =>
  normalise(`${normalise(user.first_name)} ${normalise(user.last_name)}`);

/**
 * Merges the users and employees directories into one row per user.
 *
 * The user id is the identity: `employee.user_id === user.id`. The same person
 * can carry different names in the two systems, so the employee (HR) name leads
 * and the user name is appended in brackets only when it genuinely differs
 * (ignoring case and spacing). A user with no employee record keeps the user
 * name; an employee with no linked user is dropped, as it cannot approve.
 *
 * When the employees directory is not readable, pass an empty list and the
 * result is the plain user list.
 */
export const mergeApproverDirectories = (
  users: readonly DirectoryUser[],
  employees: readonly DirectoryEmployee[],
): ApproverCandidate[] => {
  const employeeNames = new Map<number, string>();
  for (const employee of employees) {
    const name = normalise(employee.name);
    if (employee.user_id != null && name) employeeNames.set(Number(employee.user_id), name);
  }

  const merged = new Map<number, ApproverCandidate>();

  for (const user of users) {
    const id = Number(user.id);
    const account = userName(user);
    const employee = employeeNames.get(id);
    const primary = employee ?? account;
    if (!primary) continue;

    const label = employee && account && !sameName(employee, account)
      ? `${employee} (${account})`
      : primary;

    merged.set(id, {
      id,
      value: id,
      label,
      searchText: `${employee ?? ''} ${account}`.toLowerCase(),
    });
  }

  // An employee whose user the users lookup did not return (for instance an
  // inactive account filtered out there) is still a valid, named approver.
  for (const [id, name] of employeeNames) {
    if (!merged.has(id)) {
      merged.set(id, { id, value: id, label: name, searchText: name.toLowerCase() });
    }
  }

  return [...merged.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
};

/** Client-side search, id resolution and paging over the merged directory. */
export const pageApproverCandidates = (
  candidates: readonly ApproverCandidate[],
  { search = '', skip = 0, limit = 25, ids }: ApproverPageQuery,
): { data: ApproverCandidate[]; pagination: { totalCount: number } } => {
  if (ids && ids.length > 0) {
    const wanted = new Set(ids.map(Number));
    const data = candidates.filter((candidate) => wanted.has(candidate.id));
    return { data, pagination: { totalCount: data.length } };
  }

  const needle = search.trim().toLowerCase();
  const matches = needle
    ? candidates.filter((candidate) => candidate.searchText.includes(needle))
    : candidates;

  return {
    data: matches.slice(skip, skip + limit),
    pagination: { totalCount: matches.length },
  };
};
