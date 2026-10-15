/**
 * Formats an ISO timestamp for display.
 *
 * The host's `formatDate` wins when given, so dates match the rest of its app;
 * otherwise the browser locale is used. `undefined` for a missing value and the
 * raw text for an unparseable one, never "Invalid Date".
 */
export const formatTimestamp = (
  value: string | null | undefined,
  options: { formatDate?: (iso: string) => string; withTime?: boolean } = {},
): string | undefined => {
  if (!value) return undefined;
  if (options.formatDate) return options.formatDate(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return options.withTime ? date.toLocaleString() : date.toLocaleDateString();
};
