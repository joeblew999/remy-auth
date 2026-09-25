import { getRouteApi } from '@tanstack/react-router';

const root = getRouteApi('__root__');

/**
 * The language worth offering on this page, from the root route's loader data (`preferred`), for
 * any page's Shell. A server-rendered app's root loader returns it (remy-auth: src/preferred.ts);
 * parts whose routes render pages read it here.
 */
export function usePreferred() {
  return root.useLoaderData({ select: data => data.preferred });
}
