import type { Locale } from '@joeblew999/remy-ui/runtime';
import { formatLocale } from '@joeblew999/remy-ui/locale-info';
import { samples } from '@joeblew999/remy-ui/samples';

// A time zone's path, canonical name and localized name: plain functions, apart from the time-zone page
// (./time-zone.tsx), so code that only names or links a zone (the deferred-place part) pulls in no page.

// A time zone as a sub-resource of the formats page: /<locale>/time-zones/<IANA name>, a splat
// because the names contain slashes. The route's loader resolves the name with
// `canonicalTimeZone` and throws notFound() when the runtime does not know it, so an unknown
// zone is a localized 404 rather than a page with broken values.

/** The de-localized path of a time zone's page. */
export const timeZonePath = (zone: string) => `/time-zones/${zone}`;

/**
 * The runtime's own spelling of a time zone name (case normalized, for example asia/tokyo is
 * Asia/Tokyo), or undefined when Intl does not know it. Pure: the server and the browser agree.
 */
export function canonicalTimeZone(name: string | undefined): string | undefined {
  if (!name) return undefined;
  try { return new Intl.DateTimeFormat('en', { timeZone: name }).resolvedOptions().timeZone; }
  catch { return undefined; }
}

/** One part of a zone's name in a language: 'longGeneric' (Japan Time) or 'longOffset' (GMT+09:00), at the sample instant. */
export function timeZoneName(locale: Locale, zone: string, style: 'longGeneric' | 'longOffset') {
  return new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style }).formatToParts(samples.instant)
    .find(part => part.type === 'timeZoneName')?.value ?? zone;
}

/** The page: the zone's name in the page's language, its identifier, offset and the sample instant there. */
