// The modules remyParts() (./vite.js) generates from the app's src/parts.json. An entry of a part
// the app does not list is `undefined`: render or call it only when present.
declare module 'virtual:remy-parts' {
  import type { PartName } from '@joeblew999/remy-ui/parts';
  /** The listed parts, in list order. */
  export const parts: readonly PartName[];
  /** Whether the app lists `name`: code that links to another part's routes asks first. */
  export function hasPart(name: PartName): boolean;
  /** The site pages the listed parts add (de-localized): the sitemap lists them. */
  export const sitePaths: readonly string[];
}

declare module 'virtual:remy-parts/deferred-place/place' {
  /** Cloudflare's place of the request, as a server function; a loader returns it unawaited. */
  export const getPlace: typeof import('./deferred-place/place').getPlace | undefined;
}

declare module 'virtual:remy-parts/deferred-place/ui' {
  /** Cloudflare's place, streamed into the page (`place` from getPlace); `device` adds the device's own. */
  export const DeferredPlace: typeof import('./deferred-place/ui').DeferredPlace | undefined;
}

declare module 'virtual:remy-parts/seo-routes/app' {
  /** The app's own sitemap entries beside the site pages (src/parts/seo-routes.ts), for example its docs. */
  export const sitemapEntries: import('./seo-routes/sitemap').SitemapEntries | undefined;
}

declare module 'virtual:remy-parts/status-card/ui' {
  /** The live status card, and the loader of the route that shows it (fills the QueryClient for the server HTML). */
  export const StatusCard: typeof import('./status-card/ui').StatusCard | undefined;
  export const statusCardLoader: typeof import('./status-card/ui').statusCardLoader | undefined;
}

declare module 'virtual:remy-parts/status-card/app' {
  /** The app's status query (src/parts/status-card.ts), for example `orpc.status.queryOptions()`. */
  export const statusQuery: import('./status-card/query').StatusQuery | undefined;
}
