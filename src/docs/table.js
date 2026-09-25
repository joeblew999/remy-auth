// The docs table: the one list of which repository files are the site's docs, and their slugs
// (.plans/docs-site.md, decision 2). Plain JavaScript, so Fumadocs' config (source.config.ts), the
// routes, the checks and the publish task (scripts/docs-publish.mjs) all read the same rows. The files are
// read where they are: nothing is copied. Titles come from each file's first heading.

/** Where the source lives, for links to files that are not docs pages. */
export const repository = 'https://github.com/joeblew999/remy-auth';
export const branch = 'main';

/** Docs pages: the repository file and its slug; '' is /docs itself. English only. */
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

/** A page's title: the file's first "# " heading (plain Markdown has no frontmatter). The site and the index task both use it. */
export const firstHeading = source => source.match(/^#\s+(.+)$/m)?.[1].trim() ?? '';

/** The docs language: every locale serves the page in its frame, but the text and the canonical URL are English. */
export const docsLocale = 'en';

/** The de-localized path of a docs page: /docs or /docs/<slug>. */
export const docsPath = slug => (slug ? `/docs/${slug}` : '/docs');

/** Every docs page's de-localized path, in table order. Site pages (paths.js), English canonical. */
export const docsPaths = docsTable.map(row => docsPath(row.slug));

/** The docs row for a repository file, or undefined. */
export const docsRowForFile = file => docsTable.find(row => row.file === file);

/** The docs row for a slug, or undefined. */
export const docsRowForSlug = slug => docsTable.find(row => row.slug === slug);

/** A docs page's object in the R2 bucket AI Search reads (.plans/docs-ai-sync.md): <slug>.md, index.md for /docs. */
export const docsObjectKey = slug => `${slug || 'index'}.md`;

/** The docs row for an object key in that bucket, or undefined. */
export const docsRowForObjectKey = key => docsTable.find(row => docsObjectKey(row.slug) === key);
