import type { SelectOption, SelectOptionGroup } from '../types/common';

export interface GroupedOptionQuery {
  search?: string;
  skip?: number;
  limit?: number;
}

export interface GroupedOptionPage {
  data: Array<SelectOptionGroup<string>>;
  pagination: { totalCount: number };
}

type AnyOption = { label?: string; name?: string; value?: string | number; id?: string | number };

const matchesSearch = (option: AnyOption, needle: string) =>
  String(option.label ?? option.name ?? '')
    .toLowerCase()
    .includes(needle);

/**
 * Client-side search + pagination over a grouped option list.
 *
 * The entity-field catalogue arrives in one response but the ERP
 * `SearchableSelect` drives an infinite-scroll API, so it has to be sliced
 * locally. This is a pure function: the original kept a module-level mutable
 * `paginationCache` shared by every mounted sidebar, so two criteria rows open
 * at once corrupted each other's results and the cache was never released.
 * Accumulation across pages is now the caller's business — see
 * `useGroupedOptionSource`.
 */
export const paginateGroupedOptions = (
  groups: Array<SelectOptionGroup<string>> | undefined,
  query: GroupedOptionQuery,
): GroupedOptionPage => {
  const { search = '', skip = 0, limit = 25 } = query;
  const needle = search.trim().toLowerCase();

  const filtered = needle
    ? (groups ?? [])
        .map((group) => {
          const options = group.options?.filter((option) => matchesSearch(option, needle)) ?? [];
          return options.length > 0 ? { ...group, options } : null;
        })
        .filter((group): group is SelectOptionGroup<string> => group !== null)
    : (groups ?? []);

  const totalCount = filtered.reduce((sum, group) => sum + (group.options?.length ?? 0), 0);

  const page: Array<SelectOptionGroup<string>> = [];
  const end = skip + limit;
  let seen = 0;

  for (const group of filtered) {
    if (seen >= end) break;

    const size = group.options?.length ?? 0;
    if (seen + size > skip) {
      const from = Math.max(0, skip - seen);
      const to = Math.min(size, end - seen);
      const slice = group.options.slice(from, to);
      if (slice.length > 0) page.push({ ...group, options: slice });
    }
    seen += size;
  }

  return { data: page, pagination: { totalCount } };
};

/**
 * Merges a newly fetched page into the pages already shown, de-duplicating by
 * option value so infinite scroll never repeats an entry.
 */
export const mergeGroupedOptionPages = (
  accumulated: Array<SelectOptionGroup<string>>,
  incoming: Array<SelectOptionGroup<string>>,
): Array<SelectOptionGroup<string>> => {
  const byGroup = new Map<string, SelectOptionGroup<string>>();

  for (const group of accumulated) {
    byGroup.set(group.value, { ...group, options: [...group.options] });
  }

  for (const group of incoming) {
    const existing = byGroup.get(group.value);
    if (!existing) {
      byGroup.set(group.value, { ...group, options: [...group.options] });
      continue;
    }
    const seen = new Set(existing.options.map((option) => option.value));
    existing.options.push(...group.options.filter((option) => !seen.has(option.value)));
  }

  return [...byGroup.values()];
};

/**
 * Normalises an option key so `Request Approval`, `request-approval` and
 * `request_approval` all compare equal.
 */
const normalizeOptionKey = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

/**
 * Finds a reference option by its canonical key.
 *
 * Reference lists are owned by the deployment and are keyed inconsistently —
 * some return `request_approval` as the option value, others only as its label —
 * so `value`, `id` and `label` are all compared against the normalised key.
 * Returns `null` when the list has no equivalent entry, which callers treat as
 * "no default available" rather than as a failure.
 */
export const findOptionByKey = <TValue extends string | number>(
  options: Array<SelectOption<TValue>> | undefined,
  key: string,
): SelectOption<TValue> | null => {
  const needle = normalizeOptionKey(key);
  if (!needle) return null;

  return (
    (options ?? []).find(
      (option) =>
        normalizeOptionKey(option.value) === needle ||
        normalizeOptionKey(option.id) === needle ||
        normalizeOptionKey(option.label) === needle,
    ) ?? null
  );
};

/** Finds a single field's metadata inside the grouped catalogue. */
export const findGroupedOption = (
  groups: Array<SelectOptionGroup<string>> | undefined,
  value: string,
) => {
  if (!value) return null;
  for (const group of groups ?? []) {
    const match = group.options?.find((option) => option.value === value);
    if (match) return match;
  }
  return null;
};

/**
 * Flattens grouped fields into one list, prefixing each label with its section
 * ("Leave Requests / Start date") so same-named fields stay distinguishable.
 */
export const flattenFieldGroups = (
  groups: Array<SelectOptionGroup<string>> | undefined,
): Array<SelectOption<string>> =>
  (groups ?? []).flatMap((group) =>
    (group.options ?? []).map((option) => ({
      ...option,
      label: group.label ? `${group.label} / ${option.label}` : option.label,
    })),
  );
