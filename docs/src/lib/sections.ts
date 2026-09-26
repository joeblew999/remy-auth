import { docsConfig } from '../../docs.config';

/**
 * The three parts of the docs, each for one audience: the product guide (people using the app), the
 * developer docs and the API reference (developers). One list for the tabs, the landing page, each
 * section's "For AI tools" links and the root /llms.txt, so all of them say the same thing.
 */
export const sections = ([
  { key: 'docs', title: 'Product guide', audience: 'For people using the app', aiPage: '/docs/ai-assistants' },
  { key: 'dev', title: 'Developer docs', audience: 'For developers building Remy or an app on it', aiPage: '/dev/ai-tools' },
  { key: 'reference', title: 'API reference', audience: 'For developers calling the API', aiPage: '/dev/ai-tools' },
] as const).map(section => ({
  ...section,
  base: `/${section.key}`,
  llms: `/${section.key}/llms.txt`,
  llmsFull: `/${section.key}/llms-full.txt`,
  mcp: `/api/mcp/${section.key}`,
  mcpName: docsConfig.mcp[section.key].name,
}));
export type Section = (typeof sections)[number];

/** The top-bar tabs, the same on every docs and reference page. */
export const sectionTabs = sections.map(section => ({ title: section.title, url: section.base, description: section.audience }));

/** /llms.txt (llmstxt.org): what is here, per audience, with each part's llms files and MCP server. */
export const rootLlmsTxt = (origin: string) => [
  `# ${docsConfig.product}`, '',
  `> ${docsConfig.product}'s docs: a product guide for people using the app, developer docs, and the API reference. Each part has its own llms.txt, llms-full.txt, Markdown pages (add .md to a page's URL) and MCP server (Streamable HTTP; tools list_pages, get_page, search, fetch).`, '',
  `The app: ${docsConfig.appUrl}`, '',
  ...sections.flatMap(section => [
    `## ${section.title}`, '', `${section.audience}.`, '',
    `- [${section.title}](${origin}${section.base})`,
    `- [llms.txt](${origin}${section.llms}): every page with its description`,
    `- [llms-full.txt](${origin}${section.llmsFull}): every page's text`,
    `- [MCP server ${section.mcpName}](${origin}${section.mcp})`, '',
  ]),
].join('\n');
