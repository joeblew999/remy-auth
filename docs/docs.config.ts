import { defineDocsConfig } from '@joeblew999/remy-ui/docs/config';

// Everything the docs Worker says about the product it documents: with content/, the whole of this app's
// docs (the Worker itself is @joeblew999/remy-ui's src/docs; vite.config.ts names the API contract).
/**
 * The product's name, written here and nowhere else: the docs below say it, and the app takes it from
 * `docsConfig.product` (src/product.ts) for its frame, page titles, messages and sign-in email. A
 * project of another name changes this line (and the MCP servers' names below, which are identifiers).
 */
const product = 'Remy';

export const docsConfig = defineDocsConfig({
  /** The product: in titles, the navigation, social images, Ask AI's answers and the MCP servers' names. */
  product,
  /** Each site's title after the page's own (and in the navigation): users' docs, developer docs, the API reference. */
  titles: { docs: `${product} product guide`, dev: `${product} developer docs`, reference: `${product} API reference` },
  /**
   * The MCP servers (/api/mcp/<site>), one per audience: its name, and what it tells an AI tool it is for
   * (MCP's server instructions; ChatGPT and Claude show and use them). Say plainly: product or developers.
   */
  mcp: {
    docs: { name: 'remy-product-guide', audience: `${product}'s product guide, for people using the ${product} app: signing in, languages, formats, questions. Not for developers: the developer docs are remy-developer-docs.` },
    dev: { name: 'remy-developer-docs', audience: `${product}'s developer docs, for people building ${product} or an app on its shared UI package: principles, tooling, mise tasks, the UI package. The API itself is remy-api-reference; using the app is remy-product-guide.` },
    reference: { name: 'remy-api-reference', audience: `${product}'s API reference, for developers calling the ${product} API: every endpoint (OpenAPI), its parameters and responses. The developer docs are remy-developer-docs.` },
  },
  /** The live app this documents (the landing page links it). */
  appUrl: 'https://remy-auth.gedw99.workers.dev',
  /** This Worker's name: the Cloudflare Worker, its log lines and /healthz. */
  service: 'remy-auth-docs',
  /** Where the source lives: "Edit on GitHub" and links to files that are not docs pages. */
  repository: 'https://github.com/joeblew999/remy-auth',
  branch: 'main',
  /** This app's pages on adding its docs to AI tools, for app users and for developers. */
  aiHelp: { docs: '/docs/ai-assistants', dev: '/dev/ai-tools' },
  /** Ask AI: its AI Search instance, the R2 bucket it reads, its AI Gateway and its rate limit. */
  ask: { instance: 'remy-docs-pages', bucket: 'remy-docs', gateway: 'remy-docs', rateLimitNamespace: '4281' },
});
