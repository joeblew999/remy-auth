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

declare module 'virtual:remy-parts/seo-routes/app' {
  /** The app's own sitemap entries beside the site pages (src/parts/seo-routes.ts), for example its docs. */
  export const sitemapEntries: import('./seo-routes/sitemap').SitemapEntries | undefined;
}
