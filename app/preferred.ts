import { useRouteLoaderData } from 'react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';

/** The language to offer on a page: the root loader reads it from the request (cookie, Accept-Language). */
export function usePreferred(): Locale | undefined {
  return (useRouteLoaderData('root') as { preferred?: Locale } | undefined)?.preferred;
}
