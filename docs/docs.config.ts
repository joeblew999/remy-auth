// Everything the docs Worker says about the product it documents: the one file an app changes when it
// takes this docs app (with wrangler.jsonc's names, content/, and src/lib/openapi.ts's contract).
export const docsConfig = {
  /** The product: in titles, the navigation, social images, Ask AI's answers and the MCP servers' names. */
  product: 'Remy',
  /** Each site's title after the page's own (and in the navigation): users' docs, developer docs, the API reference. */
  titles: { docs: 'Remy', dev: 'Remy for developers', reference: 'Remy API reference' },
  /** The MCP servers' names, per site. */
  mcp: { docs: 'remy-docs', dev: 'remy-dev-docs' },
  /** This Worker's service name in log lines and /healthz. */
  service: 'remy-auth-docs',
  /** Where the source lives: "Edit on GitHub" and links to files that are not docs pages. */
  repository: 'https://github.com/joeblew999/remy-auth',
  branch: 'main',
  /** The R2 bucket Ask AI's AI Search instance reads (docs:publish); the instance itself is in wrangler.jsonc. */
  bucket: 'remy-docs',
} as const;
