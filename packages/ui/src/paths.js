/**
 * Every app's rule for its two kinds of page, never mixed (paths are de-localized; '' is the home page): site
 * pages are for Google, complete without JavaScript, indexed and in the sitemap; app pages live under /app,
 * need JavaScript and carry noindex. Each app lists its own pages (defineRemyApp's `sitePaths`).
 */

/** Whether a de-localized path is an app page. */
export const isAppPath = path => path === '/app' || path.startsWith('/app/');
