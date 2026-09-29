import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { suggestedLocale, suggestedLocaleInBrowser } from '@joeblew999/remy-ui/tanstack';

/**
 * The language to offer on this page: from the request's cookie and Accept-Language on the server,
 * from the browser's after hydration. The root loader returns it as `preferred`; the root passes it to
 * AppProviders, where every frame reads it, so no page passes it.
 */
export const preferredLocale = createIsomorphicFn()
  .server(() => suggestedLocale(getRequest()))
  .client(() => suggestedLocaleInBrowser(getLocale()));
