import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { sites } from '../lib/source';
import type { SiteName } from '../lib/collections';
import { branch, docsSites, repository } from './table.js';

// A docs page's data on the server, all from its site's Fumadocs loader (src/lib/source.ts): head data,
// the page tree for DocsLayout, the languages it is translated into, and the map that turns the
// Markdown's relative links (./gui.md) into the page's language's URLs. The page's text renders in the
// browser from its compiled Markdown (view.tsx), as Fumadocs' TanStack Start template does.

/** A heading: its id and plain text (Ask AI's citations name them). */
export type DocsHeading = { id: string; text: string };

/** Everything a docs page needs, all serializable. */
export type DocsPageData = {
  site: SiteName;
  /** The page's slugs joined ('' for the site's index). */
  slug: string;
  /** The page's file in its collection (the translation, else English), which the browser loads. */
  path: string;
  /** The language of the page (the URL's). */
  lang: string;
  /** The site's languages. */
  languages: string[];
  /** The languages this page has its own text in, the default first: its hreflang alternates. */
  langs: string[];
  title: string;
  description: string;
  /** The page file's last commit date (fumadocs-mdx `lastModified`), ISO. */
  lastModified?: string;
  headings: DocsHeading[];
  /** The page tree in the language, serialized for DocsLayout (useFumadocsLoader). */
  pageTree: Awaited<ReturnType<(typeof sites)['docs']['source']['serializePageTree']>>;
  /** English file path in the collection → this language's URL, for relative links. */
  links: Record<string, string>;
  /** The request's origin (https://…), for the head's absolute URLs: canonical, hreflang, social image. */
  origin: string;
  url: string;
  markdownUrl: string;
  githubUrl: string;
};

/** The page at a site's splat (`es/formats`), or undefined when the site has no such page. */
export const docsPage = createServerOnlyFn(async (name: SiteName, splat: string): Promise<DocsPageData | undefined> => {
  const site = sites[name];
  const { lang, slugs } = site.parse(splat);
  const page = site.source.getPage(slugs, lang);
  if (!page) return undefined;
  const { toc, structuredData } = await page.data.load();
  const text = new Map(structuredData.headings.map(heading => [heading.id, heading.content]));
  const lastModified = (page.data as { lastModified?: Date }).lastModified;
  const own = (value: string) => value === site.config.defaultLanguage || Boolean(site.source.getPage(slugs, value)?.path.includes(`.${value}.`));
  const links = Object.fromEntries(site.source.getPages(site.config.defaultLanguage)
    .map(english => [english.path, site.source.getPage(english.slugs, lang)?.url ?? english.url]));
  return {
    site: name,
    slug: slugs.join('/'),
    path: page.path,
    lang,
    languages: site.config.languages,
    langs: site.config.languages.filter(own),
    title: page.data.title,
    // A translation without its own description (translation is frozen) borrows the default language's.
    description: page.data.description ?? site.source.getPage(slugs, site.config.defaultLanguage)?.data.description ?? '',
    ...(lastModified ? { lastModified: lastModified.toISOString() } : {}),
    headings: toc.filter(entry => entry.depth === 2).map(entry => ({ id: entry.url.slice(1), text: text.get(entry.url.slice(1)) ?? entry.url.slice(1) })),
    pageTree: await site.source.serializePageTree(site.source.getPageTree(lang)),
    links,
    origin: new URL(getRequest().url).origin,
    url: page.url,
    markdownUrl: `${site.url(slugs.length ? slugs : ['index'], lang)}.md`,
    githubUrl: `${repository}/blob/${branch}/${docsSites[name].dir}/${page.path}`,
  };
});

/**
 * Both sites' sitemap entries: every page in every language it has its own text in, each with those
 * languages as hreflang alternates and the default as x-default, so search engines (and their AI answers)
 * index each language's page. A page only in the default language is its URL alone.
 */
export const docsSitemap = createServerOnlyFn((origin: string) => Object.values(sites).flatMap(site =>
  site.source.getPages(site.config.defaultLanguage).flatMap(english => {
    const langs = site.config.languages.filter(lang => lang === site.config.defaultLanguage || site.source.getPage(english.slugs, lang)?.path.includes(`.${lang}.`));
    const href = (lang: string) => `${origin}${site.url(english.slugs, lang)}`;
    const alternates = langs.length > 1 ? [...langs.map(lang => ({ hrefLang: lang, href: href(lang) })), { hrefLang: 'x-default', href: href(site.config.defaultLanguage) }] : [];
    return langs.map(lang => ({ loc: href(lang), alternates }));
  })));

/** The R2 folder Ask AI answers from for a site and language: its own text when the site has the language, else the default's. */
export const docsAnswerFolder = createServerOnlyFn((name: SiteName, lang: string) =>
  `${name}/${sites[name].config.languages.includes(lang) ? lang : sites[name].config.defaultLanguage}/`);
