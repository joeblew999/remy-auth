// What an app's docs say about the product they document: the one code file of an app's docs/
// (docs/docs.config.ts, `export const docsConfig = defineDocsConfig({ ... })`), beside its content/.
// The docs Worker (this package's src/docs) reads it through the preset's @remy-docs-app alias, and
// remyDocs() (./vite.ts) builds the Worker's Cloudflare configuration from it, so an app has no
// wrangler.jsonc for its docs.

export type RemyDocsConfig = {
  /** The product: in titles, the navigation, social images, Ask AI's answers and the MCP servers' names. */
  product: string;
  /** Each site's title after the page's own (and in the navigation): users' docs, developer docs, the API reference. */
  titles: { docs: string; dev: string; reference: string };
  /**
   * The MCP servers (/api/mcp/<site>), one per audience: its name, and what it tells an AI tool it is for
   * (MCP's server instructions). Say plainly: product or developers.
   */
  mcp: Record<'docs' | 'dev' | 'reference', { name: string; audience: string }>;
  /** The live app this documents (the landing page and the navigation link it). */
  appUrl: string;
  /** This Worker's name: the Cloudflare Worker, its log lines and /healthz. */
  service: string;
  /** Where the source lives: "Edit on GitHub" and links to files that are not docs pages. */
  repository: string;
  branch: string;
  /**
   * Ask AI, the app's choice: answers from its pages through Cloudflare AI Search. Leave it out and the
   * docs have no Ask AI page, button or bindings, and docs:publish has nothing to do. Its resources are
   * created by the owner (docs:provision prints what it would create).
   */
  ask?: {
    /** The AI Search instance that answers (production). */
    instance: string;
    /** The R2 bucket the instance reads; docs:publish fills it with the pages. */
    bucket: string;
    /** The AI Gateway in front of the model calls (docs:ai-gateway). */
    gateway: string;
    /** The Workers rate limit's namespace id: questions per visitor, 10 a minute. */
    rateLimitNamespace: string;
  };
};

/** Declares an app's docs settings with their type. */
export const defineDocsConfig = (config: RemyDocsConfig) => config;
