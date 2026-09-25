import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { suggestedLocale, suggestedLocaleInBrowser } from '@joeblew999/remy-ui/tanstack';

/**
 * The language to offer on this page: from the request's cookie and Accept-Language on the server,
 * from the browser's after hydration. The root loader returns it as `preferred`; pages read it with
 * the package's usePreferred (@joeblew999/remy-ui/preferred).
 */
export const preferredLocale = createIsomorphicFn()
  .server(() => suggestedLocale(getRequest()))
  .client(() => suggestedLocaleInBrowser(getLocale()));
