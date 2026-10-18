import { docsConfig } from '@remy-docs-app/docs.config.ts';
import { m } from '../../paraglide/messages.js';
import usersI18n from '@remy-docs-app/content/users/i18n.json' with { type: 'json' };
import devI18n from '@remy-docs-app/content/dev/i18n.json' with { type: 'json' };

/**
 * The sections' words in a page's language, from the docs' own translated catalog (content/ui/<lang>.json, which
 * the translator keeps, keyed "<English>(docs section)"), English when a language has none. On 2026-10-17 a Spanish
 * page's tabs were English and led to the English pages.
 */
const catalogs = import.meta.glob<Record<string, string>>('@remy-docs-app/content/ui/*.json', {
  eager: true,
  import: 'default',
});
const said = (english: string, lang = 'en') =>
  Object.entries(catalogs).find(([path]) => path.endsWith(`/ui/${lang}.json`))?.[1]?.[`${english}(docs section)`] ??
  english;

/**
 * The three parts of the docs, each for one audience: the product guide (people using the app), the
 * developer docs and the API reference (developers). One list for the tabs, the landing page, each
 * section's "For AI tools" links and the root /llms.txt, so all of them say the same thing.
 */
const help = (who: 'docs' | 'dev', key: string) => docsConfig.aiHelp?.[who] ?? `/${key}/llms.txt`;
export const sections = (
  [
    // The guide's and the developers' names are the app's own (its catalog: the top bar says them), so the docs
    // and the app never name a part two ways; the reference is the docs' alone.
    {
      key: 'docs',
      title: m.nav_guide({}, { locale: 'en' }),
      name: (lang: string) => m.nav_guide({}, { locale: lang as 'en' }),
      audience: 'For people using the app',
    },
    {
      key: 'dev',
      title: m.nav_developers({}, { locale: 'en' }),
      name: (lang: string) => m.nav_developers({}, { locale: lang as 'en' }),
      audience: `For developers building ${docsConfig.product}`,
    },
    {
      key: 'reference',
      title: 'API reference',
      name: (lang: string) => said('API reference', lang),
      audience: 'For developers calling the API',
    },
  ] as const
)
  .filter((section) => section.key !== 'reference' || __REMY_DOCS_API__)
  .map((section) => ({
    ...section,
    aiPage: help(section.key === 'docs' ? 'docs' : 'dev', section.key),
    base: `/${section.key}`,
    llms: `/${section.key}/llms.txt`,
    llmsFull: `/${section.key}/llms-full.txt`,
    mcp: `/api/mcp/${section.key}`,
    mcpName: docsConfig.mcp[section.key].name,
  }));
export type Section = (typeof sections)[number];

/** The top-bar tabs on a page in `lang`: each section's name and audience in that language, and its pages in that language (the reference has one). */
export const sectionTabs = (lang = 'en') =>
  sections.map((section) => ({
    title: section.name(lang),
    url: lang !== 'en' && section.key !== 'reference' ? `${section.base}/${lang}` : section.base,
    description: said(section.audience, lang),
  }));

/** /llms.txt (llmstxt.org): what is here, per audience, with each part's llms files and MCP server. */
export const rootLlmsTxt = (origin: string) =>
  [
    `# ${docsConfig.product}`,
    '',
    `> ${docsConfig.product}'s docs: ${sections.map((section) => `${section.title} (${section.audience.replace(/^For/, 'for')})`).join('; ')}. Each part has its own llms.txt, llms-full.txt, Markdown pages (add .md to a page's URL) and MCP server (Streamable HTTP; tools list_pages, get_page, search, fetch).`,
    '',
    `The app: ${docsConfig.appUrl}`,
    '',
    // The other languages, from each part's own list (content/<part>/i18n.json): one line, so a tool finds them.
    ...(() => {
      const other = [...new Set([...usersI18n.languages, ...devI18n.languages])].filter((lang) => lang !== 'en');
      return other.length
        ? [
            `Also in ${other.join(', ')}: put the language after the part (${origin}/docs/${other[0]}/llms.txt, ${origin}/dev/${other[0]}/llms.txt, ${origin}/dev/${other[0]}/<page>.md).`,
            '',
          ]
        : [];
    })(),
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      '',
      `${section.audience}.`,
      '',
      `- [${section.title}](${origin}${section.base})`,
      `- [llms.txt](${origin}${section.llms}): every page with its description`,
      `- [llms-full.txt](${origin}${section.llmsFull}): every page's text`,
      `- [MCP server ${section.mcpName}](${origin}${section.mcp})`,
      '',
    ]),
  ].join('\n');

/** A part's llms.txt summary line (llmstxt.org's blockquote): who it is for, and where the other parts are. */
export const llmsSummary = (key: Section['key'], origin: string) => {
  // English in every language, as root llms.txt is: it is signposting for AI tools, and a translated line read
  // clumsily and still pointed at the other parts' English files (2026-10-17). The page list is what translates.
  const section = sections.find((entry) => entry.key === key)!;
  const others = sections
    .filter((entry) => entry.key !== key)
    .map((entry) => `${entry.title}, ${entry.audience.replace(/^For/, 'for')}: ${origin}${entry.llms}`);
  return `> ${section.audience}. Elsewhere: ${others.join('; ')}. Everything: ${origin}/llms.txt.`;
};
