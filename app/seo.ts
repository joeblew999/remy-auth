import type { Locale } from '@joeblew999/remy-ui/locale';
import { pageMeta as sharedPageMeta } from '@joeblew999/remy-ui/react-router';

type Match = { loaderData?: unknown } | undefined;

/** Metadata for a localized public route, with the origin from the root loader so it is complete during client-loader fallbacks. */
export function pageMeta(params: { locale?: string }, matches: readonly Match[], path: string,
  title: (locale: Locale) => string, description: (locale: Locale) => string) {
  const origin = (matches[0]?.loaderData as { origin?: string } | undefined)?.origin ?? '';
  return sharedPageMeta(params, origin, path, title, description);
}
