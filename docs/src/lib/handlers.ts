import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import { sites } from './source';
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

/** /og/<site>/<lang?>/<slug>/image.webp: the page's social image. */
export async function ogImage(name: SiteName, splat = '') {
  const site = sites[name];
  const { lang, slugs } = site.parse(splat.replace(/\/?image\.webp$/, ''));
  const page = site.source.getPage(slugs, lang);
  if (!page) return new Response(undefined, { status: 404 });
  return generateOGImage({ title: page.data.title, description: page.data.description, site: docsConfig.titles[name], format: 'webp' });
}

const mcp = Object.fromEntries((Object.keys(sites) as SiteName[]).map(name => [name, createMcpHandler(() => {
  const server = new McpServer({ name: docsConfig.mcp[name], version: '1.0.0' });
  registerSourceTools(server, sites[name].source, sites[name].llms);
  registerSearchTool(server, sites[name].search);
  return server;
})]));

/** /api/mcp/<site>: the site's MCP server (list_pages, get_page, search). */
export const mcpHandler = (name: SiteName, request: Request) => mcp[name]!.fetch(request);
