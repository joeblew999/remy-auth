// The AI Search manifest: one item per "##" section of every docs page, from the same Fumadocs
// source the site renders (source.config.ts, compiled here by Fumadocs MDX's dynamic runtime). Each
// item's key is <slug>--<heading id>.md; its metadata carries the page URL with that heading's id,
// the section title and the release. scripts/docs-index.mjs uploads it; the docs checks prove every
// URL resolves to a heading on the built page.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as config from '../source.config.ts';
import { docsLocale, docsPath, docsTable, firstHeading } from '../src/docs/table.js';

const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * The docs rows for a list of files or slugs ("docs/tooling.md", "tooling"); every row when the list
 * is empty. An unknown name fails, listing the known ones.
 */
export function docsRows(names = []) {
  if (names.length === 0) return docsTable;
  return names.map(name => docsTable.find(row => row.file === name || row.slug === name || (name === 'index' && row.slug === ''))
    ?? (() => { throw new Error(`Not a docs page: ${name}. Docs pages: ${docsTable.map(row => `${row.file} (${row.slug || 'index'})`).join(', ')}`); })());
}

/** The docs pages, compiled (every page, or the rows given): row, title, table of contents and structured text. */
export async function docsPages(rows = docsTable) {
  const create = await dynamic(config, { environment: 'dynamic', root, configPath: 'source.config.ts', outDir: '.source' });
  const entries = rows.map(row => ({ info: { path: row.file, fullPath: `${root}${row.file}` }, data: {} }));
  const docs = await create.doc('docs', '', entries);
  return Promise.all(docs.map(async (doc, index) => {
    const loaded = await doc.load();
    // The same title the site shows (source.config.ts): the dynamic runtime leaves doc.title unset.
    return { row: rows[index], title: firstHeading(readFileSync(`${root}${rows[index].file}`, 'utf8')), toc: loaded.toc, structured: loaded.structuredData };
  }));
}

/**
 * The fenced code blocks of a Markdown file, each under the heading it follows, by heading position
 * (the n-th heading of the file is the n-th entry of Fumadocs' table of contents). Fumadocs' structured
 * text leaves code out, and the docs' commands live in code blocks.
 */
function codeByHeading(source, toc) {
  const blocks = new Map();
  let heading = -1, fence = null, lines = [];
  for (const line of source.split('\n')) {
    const open = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (open && open[2].startsWith(fence) && !open[3].trim()) {
        const id = toc[heading]?.url.slice(1);
        if (id) blocks.set(id, [...(blocks.get(id) ?? []), `\`\`\`${lang}\n${lines.join('\n')}\n\`\`\``]);
        fence = null;
      } else lines.push(line);
      continue;
    }
    if (open) { fence = open[2]; var lang = open[3].trim(); lines = []; continue; }
    if (/^#{1,6}\s/.test(line)) heading++;
  }
  return blocks;
}

/**
 * One item per "##" heading, and one for the page's opening text under its "#" heading. The text is
 * Markdown: the section title, then each paragraph, with its "###" sub-headings.
 */
export async function docsManifest({ release = 'dev', rows = docsTable } = {}) {
  const items = [];
  for (const page of await docsPages(rows)) {
    const text = new Map(page.structured.headings.map(heading => [heading.id, heading.content]));
    const code = codeByHeading(readFileSync(`${root}${page.row.file}`, 'utf8'), page.toc);
    const sections = [];
    for (const item of page.toc) {
      const id = item.url.slice(1);
      if (item.depth <= 2) sections.push({ id, depth: item.depth, headings: [id] });
      else sections.at(-1)?.headings.push(id);
    }
    for (const { id, depth, headings } of sections) {
      const body = [];
      for (const heading of headings) {
        if (heading !== id) body.push(`### ${text.get(heading) ?? heading}`);
        for (const content of page.structured.contents) if (content.heading === heading) body.push(content.content);
        body.push(...(code.get(heading) ?? []));
      }
      // A heading with no text of its own under it (an empty "Unreleased") answers nothing.
      if (body.every(part => part.startsWith('### '))) continue;
      const title = depth === 1 ? page.title : `${page.title}: ${text.get(id) ?? id}`;
      const url = `/${docsLocale}${docsPath(page.row.slug)}#${id}`;
      const markdown = `# ${title}\n\n${body.join('\n\n')}\n`;
      // The key carries a hash of what is indexed (text, URL, title), so an unchanged section keeps its
      // key and docs:index skips it; a changed one gets a new key, uploaded before the old is removed.
      const hash = createHash('sha256').update(`${url}\n${title}\n${markdown}`).digest('hex').slice(0, 12);
      items.push({ key: `${page.row.slug || 'index'}--${id}--${hash}.md`, url, title, release, text: markdown });
    }
  }
  return items;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Optional file or slug names: only those pages.
  const items = await docsManifest({ rows: docsRows(process.argv.slice(2)) });
  for (const { key, url, text } of items) console.log(`${key}\t${url}\t${text.length} bytes`);
}
