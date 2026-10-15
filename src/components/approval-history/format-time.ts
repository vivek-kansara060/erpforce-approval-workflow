import type { TimestampFormat } from './primitives';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

let relativeFormatter: Intl.RelativeTimeFormat | undefined;
let absoluteFormatter: Intl.DateTimeFormat | undefined;

/** "23 Sep 2026, 10:20 AM" in the user's locale. Built once, on first use. */
const formatAbsolute = (date: Date) => {
  absoluteFormatter ??= new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return absoluteFormatter.format(date);
};

const formatRelative = (diff: number) => {
  relativeFormatter ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < MINUTE) return relativeFormatter.format(0, 'second');
  if (abs < HOUR) return relativeFormatter.format(Math.round(diff / MINUTE), 'minute');
  if (abs < DAY) return relativeFormatter.format(Math.round(diff / HOUR), 'hour');
  return relativeFormatter.format(Math.round(diff / DAY), 'day');
};

/**
 * Formats timeline timestamps: relative for the last week ("2 hours ago"),
 * the full date after that. The full value, from the host's `formatDate` when
 * given, is always available for the hover title. Malformed values format to
 * `undefined` rather than "Invalid Date".
 */
export const createTimestampFormatter =
  (formatDate?: (iso: string) => string, now: number = Date.now()) =>
  (iso: string | undefined): TimestampFormat | undefined => {
    if (!iso) return undefined;
    const date = new Date(iso);
    const ms = date.getTime();
    if (Number.isNaN(ms)) return undefined;

    const full = formatDate ? formatDate(iso) : formatAbsolute(date);
    const diff = ms - now;
    return { label: Math.abs(diff) >= WEEK ? full : formatRelative(diff), full };
  };

export type TimestampFormatter = ReturnType<typeof createTimestampFormatter>;
