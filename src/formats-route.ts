import { getLocale } from '@joeblew999/remy-ui/locale';
import { localeInfo } from '@joeblew999/remy-ui/locale-info';
import { formatsSearchSchema } from '@joeblew999/remy-ui/showcase/search-params';
import { getPlace } from './place';

// The formats routes' critical options, in a module of their own: TanStack's code splitting keeps a
// route's loader and validateSearch in every page's first load, so this file imports nothing that
// only the formats pages render (their rows live in formats-extras.tsx, split with the component).

/** The route options both formats routes share (site /formats and app /app/formats). */
export const formatsRouteOptions = {
  // ?currency, ?count and ?calendar, validated with defaults (each route strips the defaults from its URLs).
  validateSearch: formatsSearchSchema,
  // Cloudflare's request geolocation (the network's country, region, city and time zone) comes
  // from a server function, so it is read in the Worker during SSR and client navigation alike.
  // Deferred: returned unawaited, so the page streams and the location group follows (DeferredPlace).
  loader: () => ({ info: localeInfo(getLocale()), place: getPlace() }),
  // The loader reads no search param (so no loaderDeps), and its data stays fresh for five
  // minutes: Back, Forward and the controls reuse it instead of calling the server function again.
  staleTime: 5 * 60_000,
};
