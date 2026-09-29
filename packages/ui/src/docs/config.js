// What an app's docs say about the product they document: the one code file of an app's docs/
// (docs/docs.config.ts, `export const docsConfig = defineDocsConfig({ ... })`), beside its content/.
// The docs Worker (this package's src/docs) reads it through the preset's @remy-docs-app alias, and
// remyDocs() (./vite.js) builds the Worker's Cloudflare configuration from it, so an app has no
// wrangler.jsonc for its docs.

/** Declares an app's docs settings with their type. */
export const defineDocsConfig = (config) => config;
