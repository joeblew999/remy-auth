/** A page for TanStack Start's `prerender.pages`. */
export type PrerenderPage = { path: string; prerender?: { outputPath: string } };
/**
 * Every page un-localized and in every locale, then `files` (default robots.txt and sitemap.xml),
 * then the not-found route as each locale's 404.html (the base locale's at /404.html).
 */
export declare function prerenderPages(options: { notFoundPath: string; paths?: readonly string[]; files?: readonly string[] }): PrerenderPage[];
