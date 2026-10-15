/**
 * Route helpers.
 *
 * The package only ever knows the path templates the host gave it through
 * `config.routes`; it never constructs a path from a hard-coded constant.
 */

/** Replaces `:id` (or a trailing `/:param`) with a concrete value. */
export const withId = (routeTemplate: string, id: string | number | undefined | null): string => {
  if (id === undefined || id === null || id === '') return routeTemplate;
  const value = encodeURIComponent(String(id));

  if (routeTemplate.includes(':id')) return routeTemplate.replace(':id', value);
  if (/\/:[A-Za-z0-9_]+$/.test(routeTemplate)) {
    return routeTemplate.replace(/\/:[A-Za-z0-9_]+$/, `/${value}`);
  }
  return `${routeTemplate.replace(/\/$/, '')}/${value}`;
};

/** Replaces every `:param` from a map, leaving unknown params untouched. */
export const withParams = (
  routeTemplate: string,
  params: Record<string, string | number | undefined>,
): string =>
  routeTemplate.replace(/:([A-Za-z0-9_]+)/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : encodeURIComponent(String(value));
  });
