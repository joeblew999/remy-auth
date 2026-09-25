import { createServerOnlyFn } from '@tanstack/react-start';
import { docs } from '../../.source/server';
import { docsPath, docsTable, docsRowForSlug } from './table.js';

// The docs pages' metadata, read on the server from Fumadocs MDX's server entry (source.config.ts):
// titles for the docs navigation, the page's description and its "On this page" headings. The
// `.server.ts` name keeps it out of every browser bundle (Start's import protection).

/** A heading in "On this page": its id and plain text. */
export type DocsHeading = { id: string; text: string };
/** Everything a docs page needs besides its compiled content, all serializable. */
export type DocsPageData = {
  slug: string;
  /** The Fumadocs file path the browser entry loads the content by. */
  file: string;
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

/** A description for search results: the page's first sentence-sized paragraph, cut at a word near 160 characters. */
function describe(contents: { heading?: string; content: string }[], title: string) {
  const text = contents.map(content => content.content.trim()).find(content => content.length >= 40 && /[a-z]/i.test(content)) ?? title;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** The page for a slug, or undefined for a slug the docs table does not have. */
export const docsPage = createServerOnlyFn(async (slug: string): Promise<DocsPageData | undefined> => {
  const row = docsRowForSlug(slug);
  if (!row) return undefined;
  const doc = entry(row.file);
  const { toc, structuredData } = await doc.load();
  const text = new Map(structuredData.headings.map(heading => [heading.id, heading.content]));
  return {
    slug,
    file: row.file,
    title: doc.title,
    description: describe(structuredData.contents, doc.title),
    headings: toc.filter(item => item.depth === 2).map(item => ({ id: item.url.slice(1), text: text.get(item.url.slice(1)) ?? item.url.slice(1) })),
    nav: docsNav(),
  };
});

/** Every docs page's slug, path and title, in table order: the docs navigation. */
export const docsNav = createServerOnlyFn(() => docsTable.map(row => ({ slug: row.slug, path: docsPath(row.slug), title: entry(row.file).title })));
