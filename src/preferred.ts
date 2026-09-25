import { getRouteApi } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { suggestedLocale, suggestedLocaleInBrowser } from '@joeblew999/remy-ui/tanstack';

/** The language to offer on this page: from the request's cookie and Accept-Language on the server, from the browser's after hydration. */
export const preferredLocale = createIsomorphicFn()
  .server(() => suggestedLocale(getRequest()))
  .client(() => suggestedLocaleInBrowser(getLocale()));

const root = getRouteApi('__root__');

/** The root loader's preferred language, for any page's Shell. */
export function usePreferred() {
  return root.useLoaderData({ select: data => data.preferred });
}
