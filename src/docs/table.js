// The docs table: the one list of which repository files are the site's docs, and their slugs
// (.plans/docs-site.md, decision 2). Plain JavaScript, so Fumadocs' config (source.config.ts), the
// routes, the checks and the publish task (scripts/docs-publish.mjs) all read the same rows. The files are
// read where they are: nothing is copied. Titles come from each file's first heading.

/** Where the source lives, for links to files that are not docs pages. */
export const repository = 'https://github.com/joeblew999/remy-auth';
export const branch = 'main';

/** Docs pages: the repository file (English) and its slug; '' is /docs itself. Translations: docsFile. */
export const docsTable = [
  { file: 'README.md', slug: '' },
  { file: 'docs/development.md', slug: 'development' },
  { file: 'docs/how-we-work.md', slug: 'how-we-work' },
  { file: 'docs/tooling.md', slug: 'tooling' },
  { file: 'docs/gui.md', slug: 'gui' },
  { file: 'packages/ui/README.md', slug: 'ui-package' },
  { file: 'tasks/README.md', slug: 'tasks' },
  { file: 'CHANGELOG.md', slug: 'changelog' },
];

/** A heading's explicit id, Fumadocs' `## Heading [#id]`: translations keep the English ids, so links and anchors work in every language. */
const headingId = /\s*\[#([^\]]+)\]\s*$/;

/** A page's title: the file's first "# " heading (plain Markdown has no frontmatter), without an explicit id. The site and the index task both use it. */
export const firstHeading = source => source.match(/^#\s+(.+)$/m)?.[1].replace(headingId, '').trim() ?? '';

/** The docs' own language: the files in docsTable. A locale without a translation of a page shows it in English, canonical to /en. */
export const docsLocale = 'en';

/**
 * Translations (.plans/docs-site.md, "Docs translations"): a translated page lives beside the English files
 * at docs/i18n/<locale>/<the English file's path>. Adding a language is dropping files there.
 */
export const docsI18nDir = 'docs/i18n';

/** Where a page's translation into a locale lives, whether or not it exists. */
export const docsTranslationFile = (file, locale) => `${docsI18nDir}/${locale}/${file}`;

/**
 * The one rule for which file a docs page is read from in a locale: its translation when there is one,
 * else the English file. `exists` answers for the caller's world: the files on disk (Node), or the
 * pages Fumadocs compiled (the Worker).
 */
export const docsFile = (row, locale, exists) => {
  const translation = docsTranslationFile(row.file, locale);
  return locale !== docsLocale && exists(translation) ? translation : row.file;
};

/** The locales a page has its own text in, English first, among `locales`: its hreflang alternates, in the head and the sitemap. */
export const docsLangs = (row, locales, exists) => [docsLocale, ...locales.filter(locale => docsFile(row, locale, exists) !== row.file)];

/** The locale and docs row of a translation's path (docs/i18n/<locale>/<file>), or undefined. */
export const docsTranslationOf = path => {
  const match = path.match(/^docs\/i18n\/([^/]+)\/(.+)$/);
  const row = match && docsRowForFile(match[2]);
  return row ? { locale: match[1], row } : undefined;
};

/** The de-localized path of a docs page: /docs or /docs/<slug>. */
export const docsPath = slug => (slug ? `/docs/${slug}` : '/docs');

/** Every docs page's de-localized path, in table order. Site pages (paths.js), English canonical. */
export const docsPaths = docsTable.map(row => docsPath(row.slug));

/** The docs row for a repository file, or undefined. */
export const docsRowForFile = file => docsTable.find(row => row.file === file);

/** The docs row for a slug, or undefined. */
export const docsRowForSlug = slug => docsTable.find(row => row.slug === slug);

/**
 * A docs page's object in the R2 bucket AI Search reads (.plans/docs-ai-sync.md): <slug>.md, index.md for
 * /docs; a translation under its locale, <locale>/<slug>.md.
 */
export const docsObjectKey = (slug, locale = docsLocale) => `${locale === docsLocale ? '' : `${locale}/`}${slug || 'index'}.md`;

/** The docs row and text locale for an object key in that bucket, read back through docsObjectKey, or undefined. */
export const docsObjectForKey = key => {
  const locale = key.match(/^([^/]+)\//)?.[1] ?? docsLocale;
  const row = docsTable.find(item => docsObjectKey(item.slug, locale) === key);
  return row ? { row, locale } : undefined;
};

/** The docs row for an object key in that bucket, or undefined. */
export const docsRowForObjectKey = key => docsObjectForKey(key)?.row;
