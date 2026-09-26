import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerSourceTools } from 'fumadocs-core/mcp';
import { z } from 'zod';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import { reference, referenceSearch, sites } from './source';
import type { SiteName } from './collections';
import { docsConfig } from '../../docs.config';

// The server routes Fumadocs' CLI writes (`docs:cli feature llms|og|mcp`), once for both docs sites:
// each route file passes its site. Languages come from the site's own URLs (/docs/es/...).

const text = (body: string, type: string) => new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8` } });

/** /<site>/<lang?>/<slug>.md: the page as Markdown (index.md for the site's index). */
export async function markdown(name: SiteName, splat = '') {
  const site = sites[name];
  const { lang, slugs } = site.parse(splat.replace(/\.md$/, ''));
  const page = site.source.getPage(slugs.length === 1 && slugs[0] === 'index' ? [] : slugs, lang);
  return page ? text(await site.llms.page(page), 'text/markdown') : new Response('Not found', { status: 404 });
}

/** /<site>/<lang?>/llms.txt and llms-full.txt: the site's index and full text in one language. */
export async function llmsText(name: SiteName, splat = '') {
  const site = sites[name];
  const { lang, slugs } = site.parse(splat.replace(/\.txt$/, ''));
  if (slugs.join('/') === 'llms') return text(await site.llms.index(lang), 'text/plain');
  if (slugs.join('/') === 'llms-full') return text(await site.llms.full(lang), 'text/plain');
  return new Response('Not found', { status: 404 });
}

/** /reference/llms.txt, llms-full.txt and /reference/<operation>.md: the API reference as text, from the spec. */
export async function referenceText(splat = '') {
  const name = splat.replace(/\.(txt|md)$/, '');
  if (splat === 'llms.txt') return text(await referenceLlms.index(), 'text/plain');
  if (splat === 'llms-full.txt') return text((await Promise.all(reference.getPages().map(referenceLlms.page))).join('\n'), 'text/plain');
  const page = splat.endsWith('.md') ? reference.getPage(name.split('/').filter(Boolean)) : undefined;
  return page ? text(await referenceLlms.page(page), 'text/markdown') : new Response('Not found', { status: 404 });
}

/** /og/<site>/<lang?>/<slug>/image.webp: the page's social image. */
export async function ogImage(name: SiteName, splat = '') {
  const site = sites[name];
  const { lang, slugs } = site.parse(splat.replace(/\/?image\.webp$/, ''));
  const page = site.source.getPage(slugs, lang);
  if (!page) return new Response(undefined, { status: 404 });
  return generateOGImage({ title: page.data.title, description: page.data.description, site: docsConfig.titles[name], format: 'webp' });
}

// The MCP servers, one per audience (docs.config.ts, mcp): the product guide (/api/mcp/docs), the developer
// docs (/api/mcp/dev) and the API reference (/api/mcp/reference). Fumadocs' list_pages and get_page; for
// ChatGPT (deep research, company knowledge), the read-only search and fetch it requires in place of
// Fumadocs' search: results as {id, title, url}, a page as {id, title, text, url}
// (https://developers.openai.com/api/docs/mcp). The API reference's pages are fumadocs-openapi's, which
// have no text: a page reads as its operations from the spec.
type McpSource = { getPageByUrl(url: string): Page | undefined };
type Page = { url: string; data: { title?: string } };
type McpLlms = { index(): Promise<string>; page(page: never): Promise<string> };
type McpSearch = { search(query: string): Promise<{ url: string }[]> };

const referenceLlms = {
  index: async () => reference.getPages().map(page => `- [${page.data.title}](${page.url}): ${page.data.description ?? ''}`).join('\n'),
  page: async (page: ReturnType<typeof reference.getPages>[number]) => {
    const { operations = [] } = page.data.getOpenAPIPageProps() as { operations?: { path: string; method: string }[] };
    const spec = page.data.getSchema().bundled as { paths?: Record<string, Record<string, unknown>> };
    const operation = Object.fromEntries(operations.map(({ path, method }) => [`${method.toUpperCase()} ${path}`, spec.paths?.[path]?.[method]]));
    return `# ${page.data.title} (${page.url})\n\n${page.data.description ?? ''}\n\n\`\`\`json\n${JSON.stringify(operation, null, 2)}\n\`\`\`\n`;
  },
};

const mcpParts: Record<McpName, { source: McpSource; llms: McpLlms; search: McpSearch }> = {
  docs: sites.docs, dev: sites.dev, reference: { source: reference, llms: referenceLlms, search: referenceSearch },
};

function mcpServer(name: McpName, origin: string) {
  const { source, llms, search } = mcpParts[name];
  const { name: serverName, audience } = docsConfig.mcp[name];
  const server = new McpServer({ name: serverName, title: docsConfig.titles[name], version: '1.0.0' }, { instructions: audience });
  registerSourceTools(server, source as never, llms as never);
  const found = (id: string) => source.getPageByUrl(id.startsWith(origin) ? id.slice(origin.length) : id);
  const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });
  server.registerTool('search', {
    title: 'Search', description: `Search ${audience.split(':')[0]}. Returns {results: [{id, title, url}]}; read one with fetch(id).`,
    inputSchema: z.object({ query: z.string() }), annotations: { readOnlyHint: true },
  }, async ({ query }) => {
    const urls = [...new Set((await search.search(query)).map(hit => hit.url.split('#')[0]!))];
    const pages = urls.map(url => source.getPageByUrl(url)).filter(page => page !== undefined).slice(0, 10);
    return json({ results: pages.map(page => ({ id: page.url, title: page.data.title ?? page.url, url: `${origin}${page.url}` })) });
  });
  server.registerTool('fetch', {
    title: 'Fetch', description: 'The full text of a page, by the id search returned (its path or URL). Returns {id, title, text, url}.',
    inputSchema: z.object({ id: z.string() }), annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const page = found(id);
    if (!page) return { ...json({ error: `not found: ${id}` }), isError: true };
    return json({ id: page.url, title: page.data.title ?? page.url, text: await llms.page(page as never), url: `${origin}${page.url}` });
  });
  return server;
}

export type McpName = keyof typeof docsConfig.mcp;
export const isMcpName = (value: string): value is McpName => value in docsConfig.mcp;

/** /api/mcp/<docs|dev|reference>: that audience's MCP server (list_pages, get_page, search, fetch). */
export const mcpHandler = (name: McpName, request: Request) =>
  createMcpHandler(() => mcpServer(name, new URL(request.url).origin)).fetch(request);
