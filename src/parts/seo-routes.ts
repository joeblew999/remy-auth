import type { SitemapEntries } from '@joeblew999/remy-ui/parts/seo-routes/sitemap';
import { docsLangs } from '../docs/source.server';
import { docsLocale, docsPath, docsTable } from '../docs/table.js';

// This app's options for the seo-routes part (src/parts.json; .plans/parts.md): what its sitemap
// lists beside the site pages. Unused when the part is not listed.

/**
 * The docs, by the rule of their pages' heads: each language a page has its own text in, with those
 * languages as alternates and English as x-default; a page only in English, its /en URL alone
 * (.plans/docs-site.md, decision 3 and "Docs translations").
 */
export const sitemapEntries: SitemapEntries = origin => docsTable.flatMap(({ slug }) => {
  const path = docsPath(slug);
  const langs = docsLangs(slug);
  const alternates = langs.length > 1
    ? [...langs.map(value => ({ hrefLang: value, href: `${origin}/${value}${path}` })), { hrefLang: 'x-default', href: `${origin}/${docsLocale}${path}` }]
    : [];
  return langs.map(locale => ({ loc: `${origin}/${locale}${path}`, alternates }));
});
