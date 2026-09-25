import { createServerOnlyFn } from '@tanstack/react-start';
import type { Root } from 'hast';
import { createI18nSearchAPI, type SearchAPI } from 'fumadocs-core/search/server';
import { defineI18n } from 'fumadocs-core/i18n';
import { locales } from '@joeblew999/remy-ui/locale';
import { docs } from '../../.source/server';
import { docsFile, docsLangs as langsOf, docsLocale, docsPath, docsTable, docsRowForSlug, docsTranslationOf } from './table.js';

// The docs pages, read on the server from Fumadocs MDX's server entry (source.config.ts): the
// article's finished HTML tree, titles for the docs navigation, the page's description and its "On
// this page" headings. The `.server.ts` name keeps it, and every page's compiled Markdown, out of
// every browser bundle (Start's import protection): the browser gets the page as data, never as code
// (.plans/docs-site.md, "Server-rendered docs").

/** A heading in "On this page": its id and plain text. */
export type DocsHeading = { id: string; text: string };
/** Everything a docs page needs, all serializable. */
export type DocsPageData = {
  slug: string;
  /** The repository file the page is read from: the translation, or the English file. */
  file: string;
  /** The language of the text: the locale when it has a translation, else English. */
  lang: string;
  /** Every locale the page has its own text in, English first: its hreflang alternates. */
  langs: string[];
  /** The article: the Markdown's finished HTML tree (hast), which view.tsx renders. */
  tree: Root;
  title: string;
  description: string;
  headings: DocsHeading[];
  nav: { slug: string; path: string; title: string }[];
};

const entries = new Map(docs.map(doc => [doc.info.path, doc]));
const entry = (file: string) => {
  const doc = entries.get(file);
  if (!doc) throw new Error(`The docs table names ${file}, which Fumadocs did not compile`);
  return doc;
};

/** The file a page is read from in a locale (table.js's one rule), from the pages Fumadocs compiled. */
const fileIn = (row: { file: string }, locale: string) => docsFile(row, locale, file => entries.has(file));
/** The language of that file's text. */
const langOf = (file: string) => docsTranslationOf(file)?.locale ?? docsLocale;

/** Fumadocs' i18n config: the site's languages, English the default and the fallback. */
const i18n = defineI18n({ languages: [...locales], defaultLanguage: docsLocale, parser: 'dir' });
/** The languages the docs have a translation in, English first: each gets its own search index. */
const docsLocales = [docsLocale, ...new Set(docs.flatMap(doc => docsTranslationOf(doc.info.path)?.locale ?? []))];
/** The locales a page has its own text in, English first. */
export const docsLangs = createServerOnlyFn((slug: string) => {
  const row = docsRowForSlug(slug);
  return row ? langsOf(row, docsLocales, file => entries.has(file)) : [];
});

/** A description for search results: the page's first sentence-sized paragraph, cut at a word near 160 characters. */
function describe(contents: { heading?: string; content: string }[], title: string) {
  const text = contents.map(content => content.content.trim()).find(content => content.length >= 40 && /[a-z]/i.test(content)) ?? title;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** The page for a slug in a locale (its translation, else English), or undefined for a slug the docs table does not have. */
export const docsPage = createServerOnlyFn(async (slug: string, locale: string = docsLocale): Promise<DocsPageData | undefined> => {
  const row = docsRowForSlug(slug);
  if (!row) return undefined;
  const file = fileIn(row, locale);
  const doc = entry(file);
  const { toc, structuredData, _exports } = await doc.load();
  const text = new Map(structuredData.headings.map(heading => [heading.id, heading.content]));
  return {
    slug,
    file,
    lang: langOf(file),
    langs: docsLangs(slug),
    tree: (_exports as { tree: Root }).tree,
    title: doc.title,
    description: describe(structuredData.contents, doc.title),
    headings: toc.filter(item => item.depth === 2).map(item => ({ id: item.url.slice(1), text: text.get(item.url.slice(1)) ?? item.url.slice(1) })),
    nav: docsNav(locale),
  };
});

/** Every docs page's slug, path and title in a locale (translated titles where there are), in table order: the docs navigation. */
export const docsNav = createServerOnlyFn((locale: string = docsLocale) => docsTable.map(row => ({ slug: row.slug, path: docsPath(row.slug), title: entry(fileIn(row, locale)).title })));

/** A piece of a search hit's text; `mark` where it matches the query. */
export type DocsSearchText = { text: string; mark?: true }[];
/** A search hit: a page (its title), or a heading or paragraph on it, with its de-localized URL and anchor. */
export type DocsSearchHit = { type: 'page' | 'heading' | 'text'; url: string; content: DocsSearchText };

/**
 * Fumadocs' own search server (fumadocs-core `createI18nSearchAPI('advanced')`, which `createFromSource`
 * builds from an i18n Fumadocs loader; this app has a collection, not a loader, so it passes the same
 * indexes itself): one index per docs page and docs language from its structured text, sections with
 * their anchors, each tagged with its locale so a search reads one language's pages (Fumadocs'
 * default multilingual tokenizer). A locale without translations searches English. Built on the
 * first search in each Worker isolate, then kept; none of it reaches the browser
 * (.plans/docs-site.md, "Docs search" and "Docs translations").
 */
let search: SearchAPI | undefined;
const searchServer = () => search ??= createI18nSearchAPI('advanced', {
  i18n,
  indexes: () => Promise.all(docsLocales.flatMap(locale => docsTable.map(async row => {
    const doc = entry(fileIn(row, locale));
    const { structuredData } = await doc.load();
    return { id: `${locale}${docsPath(row.slug)}`, locale, url: docsPath(row.slug), title: doc.title, structuredData };
  }))),
});

/**
 * Fumadocs returns a hit's text as Markdown with the matches in <mark>: split it into plain pieces
 * (undoing Markdown's escapes), so the page renders text, never HTML.
 */
const plain = (markdown: string) => markdown.replace(/\\([!-/:-@[-`{-~])/g, '$1').replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
const pieces = (content: string): DocsSearchText => content.split(/<mark>(.*?)<\/mark>/s)
  .map((text, index) => (index % 2 ? { text: plain(text), mark: true as const } : { text: plain(text) }))
  .filter(piece => piece.text);

/** The docs' hits for a query in a locale's docs, as Fumadocs orders them: each page, then its matching sections. */
export const docsSearch = createServerOnlyFn(async (query: string, locale: string = docsLocale): Promise<DocsSearchHit[]> =>
  (await searchServer().search(query, { locale: docsLocales.includes(locale) ? locale : docsLocale }))
    .map(hit => ({ type: hit.type, url: hit.url, content: pieces(hit.content) })));
