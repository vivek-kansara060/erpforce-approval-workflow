/**
 * Helpers for `entity_type_data`, the owning module's data for a record under
 * approval. Its values can be strings, numbers, booleans, arrays or nested
 * objects, so the modal walks it through these instead of assuming a shape.
 */

export type EntityDataRecord = Record<string, unknown>;

export const isPlainObject = (value: unknown): value is EntityDataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `purchase_order_date` -> `Purchase Order Date`. */
export const humanizeKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .replace(/\b\w+/g, (word) =>
      word.toLowerCase() === 'id' ? 'ID' : word.charAt(0).toUpperCase() + word.slice(1),
    );

/** A scalar the modal can print on one line. */
export const isScalar = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value);

/** The record's series number, or `undefined` when the module sent none. */
export const getSeriesNumber = (data: unknown): string | undefined => {
  if (!isPlainObject(data)) return undefined;
  const value = data.series_number;
  return isScalar(value) && String(value).trim() !== '' ? String(value) : undefined;
};

const NAME_KEYS = ['name', 'title', 'label', 'full_name', 'code', 'series_number'] as const;

/** Audit columns every module carries; they say nothing about the record itself. */
const AUDIT_KEY = /^(created|updated|deleted)_(at|by|user)$|^is_deleted$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

/** Money fields and their currency are not shown; the module's own screen owns them. */
const MONEY_KEY = /(amount|price|total|cost|currency)/;

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isPlainObject(value) && Object.keys(value).length === 0);

/** The one-line name of an embedded record (`vendor_data`), if it has one. */
export const getDisplayName = (value: unknown): string | undefined => {
  if (!isPlainObject(value)) return undefined;
  const person = [value.first_name, value.last_name].filter((part) => isScalar(part) && part !== '');
  const name =
    NAME_KEYS.map((key) => value[key]).find((candidate) => isScalar(candidate) && candidate !== '') ??
    (person.length ? person.join(' ') : undefined);
  if (name === undefined) return undefined;
  return String(name);
};

/** An ISO timestamp as a date, plus the time unless it is local midnight. */
const formatIso = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const midnight = date.getHours() === 0 && date.getMinutes() === 0;
  return midnight ? date.toLocaleDateString() : date.toLocaleString();
};

export interface DetailRow {
  key: string;
  label: string;
  /** A display string, a list of display strings, or raw data too irregular to summarise. */
  value: unknown;
}

export interface DetailLabels {
  yes: string;
  no: string;
}

/**
 * Rows to show for a record.
 *
 * `entity_type_data` is a database row plus its joins, so printed key by key it
 * is mostly noise. This keeps what a person would want to read:
 * - drops `id`, every `*_id` (the sibling `*_data` carries the name) and audit columns;
 * - collapses `vendor_data: { id, name, ... }` into "Vendor: <name>";
 * - drops money and currency fields;
 * - formats dates, numbers and 0/1 flags;
 * - skips empty values.
 * Objects with no recognisable name stay as raw data so nothing is silently lost.
 */
export const getDetailRows = (data: unknown, labels: DetailLabels): DetailRow[] => {
  if (!isPlainObject(data)) return [];

  const rows: DetailRow[] = [];
  for (const [key, raw] of Object.entries(data)) {
    if (
      key === 'id' ||
      key === 'series_number' || key.endsWith('_id') ||
      AUDIT_KEY.test(key) ||
      MONEY_KEY.test(key)
    ) {
      continue;
    }
    if (isEmpty(raw)) continue;

    const base = key.replace(/_(data|user)$/, '');
    const label = humanizeKey(base);

    let value: unknown = raw;
    if (typeof raw === 'boolean' || (/^(is|has)_/.test(key) && (raw === 0 || raw === 1))) {
      value = raw ? labels.yes : labels.no;
    } else if (typeof raw === 'string' && ISO_DATE.test(raw)) {
      value = formatIso(raw);
    } else if (typeof raw === 'number') {
      value = raw.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (isPlainObject(raw)) {
      value = getDisplayName(raw) ?? raw;
    } else if (Array.isArray(raw)) {
      const names = raw.map((item) => (isScalar(item) ? String(item) : getDisplayName(item)));
      value = names.every((name) => name !== undefined) ? names : raw;
    }

    rows.push({ key, label, value });
  }
  return rows;
};
