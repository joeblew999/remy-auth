// The clock page's route options, in a module of their own: a route's validateSearch is in every page's
// first load, so this imports nothing the page itself renders. An app's route file spreads them:
//   createFileRoute('/app/clock')({ ...clockRouteOptions, search: { middlewares: [stripSearchParams(clockDefaults)] }, head, component })
// (the middleware stays in the route file, where TanStack infers its types, as the formats routes do).

/** The zones the clock shows when the address names none. */
export const clockDefaults = { zones: 'Europe/London,Asia/Tokyo' };

/**
 * ?zones=Asia/Tokyo,Europe/London, so a set of zones is a link to share. A plain function, not a Zod
 * schema: full Zod probes eval, which the Content-Security-Policy forbids, and it loads with every page.
 */
export const clockRouteOptions = {
  validateSearch: (search: Record<string, unknown>) => ({ zones: typeof search.zones === 'string' ? search.zones : clockDefaults.zones }),
};

/** The zones in a validated search, as a list. */
export const clockZones = (search: { zones: string }) => search.zones.split(',').filter(Boolean);
