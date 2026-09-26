// Everything the docs Worker says about the product it documents: the one file an app changes when it
// takes this docs app (with wrangler.jsonc's names, content/, and src/lib/openapi.ts's contract).
export const docsConfig = {
  /** The product: in titles, the navigation, social images, Ask AI's answers and the MCP servers' names. */
  product: 'Remy',
  /** Each site's title after the page's own (and in the navigation): users' docs, developer docs, the API reference. */
  titles: { docs: 'Remy product guide', dev: 'Remy developer docs', reference: 'Remy API reference' },
  /**
   * The MCP servers (/api/mcp/<site>), one per audience: its name, and what it tells an AI tool it is for
   * (MCP's server instructions; ChatGPT and Claude show and use them). Say plainly: product or developers.
   */
  mcp: {
    docs: { name: 'remy-product-guide', audience: "Remy's product guide, for people using the Remy app: signing in, languages, formats, questions. Not for developers: the developer docs are remy-developer-docs." },
    dev: { name: 'remy-developer-docs', audience: "Remy's developer docs, for people building Remy or an app on its shared UI package: principles, tooling, mise tasks, the UI package. The API itself is remy-api-reference; using the app is remy-product-guide." },
    reference: { name: 'remy-api-reference', audience: "Remy's API reference, for developers calling the Remy API: every endpoint (OpenAPI), its parameters and responses. The developer docs are remy-developer-docs." },
  },
  /** The live app this documents (the landing page links it). */
  appUrl: 'https://remy-auth.gedw99.workers.dev',
  /** This Worker's service name in log lines and /healthz. */
  service: 'remy-auth-docs',
  /** Where the source lives: "Edit on GitHub" and links to files that are not docs pages. */
  repository: 'https://github.com/joeblew999/remy-auth',
  branch: 'main',
  /** The R2 bucket Ask AI's AI Search instance reads (docs:publish); the instance itself is in wrangler.jsonc. */
  bucket: 'remy-docs',
} as const;
