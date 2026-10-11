// The docs Worker, @joeblew999/remy-ui's, over an app's docs/ (`remy docs …`, npm run docs): run it
// (dev), build and check it, test it locally or against its deployment (every MCP server's tools
// included), a preview Worker, Ask AI's answers paused or resumed (an emergency stop, seconds), its
// pages published to the index, what Ask AI needs on Cloudflare (printed, created never), its logs and
// its gateway (observe.ts, with the docs Worker's generated configuration), and starting an app's docs.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { main as observe } from './observe.ts';

function fail(message: string): never { console.error(message); process.exit(1); }
const docs = () => { if (!existsSync('docs')) fail('this app has no docs/ (remy docs init <ref> starts one)'); return join(process.cwd(), 'docs'); };
const bin = (name: string) => join(process.cwd(), 'node_modules', '.bin', name);
function tool(command: string, args: string[], options: { env?: Record<string, string>; input?: string } = {}): void {
  const result = spawnSync(command, args, { cwd: docs(), stdio: [options.input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'], env: { ...process.env, ...options.env }, input: options.input });
  if (result.status !== 0) fail(`${command} ${args.join(' ')}: failed`);
}
/** The docs Worker's generated configuration (vite.config.ts writes .remy-docs/ when run). */
const generated = (): string => { execFileSync(process.execPath, ['vite.config.ts'], { cwd: docs(), stdio: 'ignore' }); return '.remy-docs/wrangler.json'; };
const previewName = () => `${(JSON.parse(readFileSync(join(docs(), '.remy-docs', 'wrangler.json'), 'utf8')) as { name: string }).name}-preview`;

export const dev = (): void => tool(bin('vite'), ['dev']);
export const build = (): void => tool(bin('vite'), ['build']);
/** Build (which writes .remy-docs/), binding types, types. */
export function check(): void { build(); tool(bin('wrangler'), ['types', '-c', '.remy-docs/wrangler.json']); tool(bin('tsc'), ['-p', '.']); }
/** The docs' browser checks on a local build, at the docs preview port. */
export function test(): void { build(); tool(bin('playwright'), ['test', '-c', '../node_modules/@joeblew999/remy-ui/src/docs/playwright.config.js', '--project=ours'], { env: { PREVIEW_PORT: process.env.DOCS_PREVIEW_PORT ?? '4174' } }); }
/** The docs' checks against their deployment (DOCS_TEST_URL, else the docs origin), then every MCP server's tools. */
export function testRemote(): void {
  const origin = process.env.DOCS_TEST_URL ?? process.env.DOCS_ORIGIN;
  if (!origin) fail('docs test remote: DOCS_TEST_URL, or origins.docs in remy.config.ts');
  generated();
  tool(bin('playwright'), ['test', '-c', '../node_modules/@joeblew999/remy-ui/src/docs/playwright.config.js'], { env: { TEST_TARGET: 'remote', TEST_BASE_URL: origin } });
  const hasApi = (JSON.parse(readFileSync(join(docs(), '.remy-docs', 'app.json'), 'utf8')) as { api?: unknown }).api;
  for (const server of ['docs', 'dev', ...(hasApi ? ['reference'] : [])]) tool('npx', ['-y', '@modelcontextprotocol/inspector@2.8.0', '--cli', `${origin}/api/mcp/${server}`, '--transport', 'http', '--method', 'tools/list']);
}
/** A preview Worker of the docs, answers paused. */
export function preview(): void {
  build(); generated();
  const name = previewName();
  tool(bin('wrangler'), ['deploy', '-c', 'dist/server/wrangler.json', '--name', name]);
  tool(bin('wrangler'), ['secret', 'put', 'ASK_PAUSED', '-c', '.remy-docs/wrangler.json', '--name', name], { input: '1' });
}
/** Ask AI's answers: off (an emergency stop, seconds, no build) or on again. */
export function answers(state: 'on' | 'off'): void {
  generated();
  if (state === 'off') tool(bin('wrangler'), ['secret', 'put', 'ASK_PAUSED', '-c', '.remy-docs/wrangler.json'], { input: '1' });
  else tool(bin('wrangler'), ['secret', 'delete', 'ASK_PAUSED', '-c', '.remy-docs/wrangler.json']);
}
/** Make Ask AI's bucket hold exactly the pages the live docs Worker serves, start a sync, check the fixed questions find their pages; nothing without `ask`. */
export function publish(): void {
  for (const script of ['docs-publish.mjs', 'docs-questions.mjs']) {
    const result = spawnSync(process.execPath, [join(process.cwd(), 'node_modules', '@joeblew999', 'remy-ui', 'src', 'docs', 'scripts', script)], { stdio: 'inherit' });
    if (result.status !== 0) fail(`docs publish: ${script} failed`);
  }
}
/** What this app's Ask AI needs on Cloudflare, from docs.config.ts's `ask`, as the commands that create it. Creates nothing: that costs money and is the owner's. */
export async function provision(): Promise<void> {
  const { docsConfig } = await import(pathToFileURL(join(docs(), 'docs.config.ts')).href) as { docsConfig: { ask?: { bucket: string; instance: string; gateway: string; rateLimitNamespace: string }; service: string } };
  const { ask, service } = docsConfig;
  if (!ask) { console.log('docs.config.ts has no `ask`: Ask AI is off, nothing to create.'); return; }
  console.log(`Ask AI for ${service} needs, on the Cloudflare account wrangler is logged in to (nothing is created here):`);
  console.log(`  1. the R2 bucket its pages go to:    npx wrangler r2 bucket create ${ask.bucket}`);
  console.log(`  2. the AI Search instance over it:   npx wrangler ai-search create ${ask.instance} --type r2 --source ${ask.bucket}`);
  console.log(`  3. its AI Gateway, ${ask.gateway}: set it as the instance's gateway (dashboard: AI Search, ${ask.instance}, Settings), then npm run docs -- observe gateway show`);
  console.log(`  4. the rate limit: namespace ${ask.rateLimitNamespace}, a number unique on the account (Workers rate limiting needs no creating)`);
  console.log('Then npm run dev:promote: it deploys the docs and publishes the pages to the bucket.');
}
/** The docs app for a new repository, from remy-auth's template at a tag. */
export function init(ref: string | undefined): void {
  if (!ref) fail('remy docs init <ref>: the remy-auth tag to take the docs app from, e.g. v0.14.0 (match your @joeblew999/remy-ui version)');
  if (existsSync('docs')) fail('docs/ exists already');
  const result = spawnSync('npx', ['-y', 'giget@3.3.1', `gh:joeblew999/remy-auth/template/docs#${ref}`, 'docs'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  switch (command) {
    case 'dev': return dev();
    case 'build': return build();
    case 'check': return check();
    case 'test': return rest[0] === 'remote' ? testRemote() : test();
    case 'preview': return preview();
    case 'answers': { if (rest[0] !== 'on' && rest[0] !== 'off') fail('remy docs answers on|off'); return answers(rest[0]); }
    case 'publish': return publish();
    case 'provision': return provision();
    case 'init': return init(rest[0]);
    case 'observe': { generated(); process.env.REMY_WRANGLER_CONFIG = join(docs(), '.remy-docs', 'wrangler.json'); process.chdir(docs()); return observe(rest); }
    default: fail('remy docs: dev | build | check | test [remote] | preview | answers on|off | publish | provision | init <ref> | observe …');
  }
}
