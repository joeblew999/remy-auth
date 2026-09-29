// The two docs sites for code that runs without their Fumadocs loaders (Node scripts, the checks, the
// sitemap), from Fumadocs' own files: each site's meta.json (its pages, in order) and i18n.json (its
// languages). The sites themselves read everything from the loaders (lib/source.ts). Layout (the app's
// docs/content/<users|dev>/, paths from the repository root): <page>.md or .mdx in the site's default
// language, a translation beside it as <page>.<lang>.md(x). Pure: the Worker gives it the app's files
// through Vite (table.js), the Node scripts from the file system (scripts/app-table.mjs).

/** The docs table over one app's sites and config. */
export function docsTableOf({ users, dev }, docsConfig) {
  /** Where the source lives, for links to files that are not docs pages (docs.config.ts). */
  const { repository, branch } = docsConfig;

  /** The sites by name (their URL base): users' docs at /docs, developers' at /dev. */
  const docsSites = {
    docs: { dir: 'docs/content/users', meta: users.meta, ...users.i18n },
    dev: { dir: 'docs/content/dev', meta: dev.meta, ...dev.i18n },
  };

  const isPage = page => !page.startsWith('[') && !page.startsWith('---');

  /** Every page of both sites in meta.json's order: its site, file path without extension, and slug ('' for the index). */
  const docsTable = Object.entries(docsSites).flatMap(([site, { dir, meta }]) =>
    meta.pages.filter(isPage).map(page => ({ site, base: `${dir}/${page}`, slug: page === 'index' ? '' : page })));

  /** A page's URL in a language: the site's base, the language unless it is the default, the slug. */
  const docsUrl = (site, slug, lang = docsSites[site].defaultLanguage) =>
    `/${[site, lang === docsSites[site].defaultLanguage ? '' : lang, slug].filter(Boolean).join('/')}`;

  /** A page's file in a language as `exists` finds it (.md or .mdx): its translation, else the default language's. */
  const docsFile = (row, lang, exists) => {
    const own = lang === docsSites[row.site].defaultLanguage ? [] : [`${row.base}.${lang}.md`, `${row.base}.${lang}.mdx`];
    return [...own, `${row.base}.md`, `${row.base}.mdx`].find(exists) ?? `${row.base}.md`;
  };

  /**
   * The languages a page has its own text in, the default first: its hreflang alternates. None for an entry
   * with no file (the API reference, whose pages fumadocs-openapi makes from the contract).
   */
  const docsLangs = (row, exists) => (![`${row.base}.md`, `${row.base}.mdx`].some(exists) ? [] : docsSites[row.site].languages.filter(lang =>
    lang === docsSites[row.site].defaultLanguage || docsFile(row, lang, exists).includes(`.${lang}.`)));

  /**
   * A page's object in the R2 bucket AI Search reads (.plans/done/docs-ai-sync.md): <site>/<lang>/<slug>.md,
   * index.md for the site's index. Ask AI answers from one folder (<site>/<lang>/).
   */
  const docsObjectKey = (site, slug, lang) => `${site}/${lang}/${slug || 'index'}.md`;

  /** The docs row and language for an object key, or undefined. */
  const docsObjectForKey = key => {
    const match = key.match(/^([^/]+)\/([^/]+)\/(.+)\.md$/);
    if (!match) return undefined;
    const [, site, lang, name] = match;
    const row = docsTable.find(item => item.site === site && (item.slug || 'index') === name);
    return row ? { row, lang } : undefined;
  };

  /** The docs site and language of a URL path (/dev/es/gui → dev, es), or undefined outside the docs. */
  const docsLangOfPath = pathname => {
    const [, first, second] = pathname.split('/');
    const site = docsSites[first];
    if (!site) return undefined;
    return { site: first, lang: site.languages.includes(second) ? second : site.defaultLanguage };
  };
  return { repository, branch, docsSites, docsTable, docsUrl, docsFile, docsLangs, docsObjectKey, docsObjectForKey, docsLangOfPath };
}
