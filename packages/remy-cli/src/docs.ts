// The docs Worker, @joeblew999/remy-ui's, over an app's docs/ (`remy docs …`, pnpm remy docs): run it
// (dev), build and check it, test it locally or against its deployment (every MCP server's tools
// included), Ask AI's answers paused or resumed (an emergency stop, seconds), its fixed questions against the index,
// what Ask AI needs on Cloudflare (printed, created never), its logs and its gateway (observe.ts). Its pages reach the
// index by themselves: the docs Worker publishes them after each new version (remy-ui's docs/publish.server.ts).
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { main as observe } from './observe.ts';
import { dispatch, type Subcommands } from './commands.ts';
import { bin, docsDir, origins, ports } from './config.ts';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
const docs = () => {
  return (
    docsDir() ?? fail('this app has no docs/ (vpx giget gh:joeblew999/remy-auth/template/docs#<tag> docs starts one)')
  );
};
/** Wrangler's answer to a command, as text; throws with its stderr when it fails. */
const wrangler = (...args: string[]): string =>
  execFileSync(bin('wrangler'), args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

type DocsConfig = {
  repository: string;
  branch: string;
  service: string;
  ask?: { instance: string; bucket: string; gateway: string; rateLimitNamespace: string };
};
type Question = { question: string; finds: string };
/**
 * The app's docs as the questions read them from the file system: its docs/docs.config.ts
 * (Node runs TypeScript itself), the docs table over its docs/content (the package's table-core, the one the
 * docs Worker builds its pages and reads citations with) and its fixed Ask AI questions (docs/content/questions.json).
 */
async function appDocs(): Promise<{
  docsConfig: DocsConfig;
  table: import('@joeblew999/remy-ui/docs/table-core').DocsTable;
  questions: Question[];
}> {
  const root = process.cwd();
  const json = (file: string) => JSON.parse(readFileSync(join(docs(), file), 'utf8'));
  const { docsConfig } = (await import(pathToFileURL(join(docs(), 'docs.config.ts')).href)) as {
    docsConfig: DocsConfig;
  };
  const { docsTableOf } = (await import(
    pathToFileURL(join(root, 'node_modules', '@joeblew999', 'remy-ui', 'src', 'docs', 'docs', 'table-core.js')).href
  )) as typeof import('@joeblew999/remy-ui/docs/table-core');
  const table = docsTableOf(
    {
      users: { meta: json('content/users/meta.json'), i18n: json('content/users/i18n.json') },
      dev: { meta: json('content/dev/meta.json'), i18n: json('content/dev/i18n.json') },
    },
    docsConfig,
    relative(root, docs()),
  );
  return { docsConfig, table, questions: json('content/questions.json') as Question[] };
}
function tool(command: string, args: string[], options: { env?: Record<string, string>; input?: string } = {}): void {
  const result = spawnSync(command, args, {
    cwd: docs(),
    stdio: [options.input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
    env: { ...process.env, ...options.env },
    input: options.input,
  });
  if (result.status !== 0) fail(`${command} ${args.join(' ')}: failed`);
}

/**
 * The docs' production build must already be there (the docs package's build task: vp run ready builds it, and a
 * task that needs it names it in its dependsOn): a docs command never builds by itself, so nothing builds twice and
 * nothing builds out of Vite Plus's sight (2026-10-17: the skill rebuilt the whole site on every new-app run).
 */
export function built(): void {
  if (!existsSync(join(docs(), 'dist', 'server', 'wrangler.json')))
    fail(
      `docs: no build in ${relative(process.cwd(), docs()) || '.'}/dist: vp run ready builds it (the docs' build task).`,
    );
}
/**
 * The built docs on local Workers, as their checks and AI tools see them (/dev/llms.txt, each page's .md), at
 * DOCS_PREVIEW_PORT: the one way to serve them (`remy docs serve`, and the remy skill's build), so nobody runs
 * Wrangler by hand to look (2026-10-17). Resolves once they answer; `stop` ends the server.
 */
export async function serveBuilt(port = ports().docsPreview): Promise<{ origin: string; stop: () => void }> {
  const server = spawn(
    bin('wrangler'),
    ['dev', '-c', 'dist/server/wrangler.json', '--local', '--ip', '127.0.0.1', '--port', String(port)],
    { cwd: docs(), stdio: 'ignore' },
  );
  const origin = `http://127.0.0.1:${port}`;
  const stop = () => {
    server.kill();
  };
  for (
    let waited = 0;
    !(await fetch(`${origin}/llms.txt`).then(
      (response) => response.ok,
      () => false,
    ));
    waited++
  ) {
    if (waited >= 90) {
      stop();
      fail(`docs serve: ${origin} did not answer within 90 s`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { origin, stop };
}

/** `remy docs serve`: the built docs here until stopped (Ctrl-C). */
async function serve(): Promise<void> {
  built();
  const { origin, stop } = await serveBuilt();
  console.log(
    `docs: the built docs at ${origin} (AI tools read ${origin}/llms.txt, ${origin}/dev/llms.txt, each page's .md); Ctrl-C stops them.`,
  );
  process.on('SIGINT', () => {
    stop();
    process.exit(0);
  });
  await new Promise(() => {});
}

/** The docs' Playwright configuration, in the remy-ui the docs app installed (resolved from its own folder). */
const docsChecks = (): string =>
  join(
    dirname(createRequire(join(docs(), 'package.json')).resolve('@joeblew999/remy-ui/docs/vite')),
    'playwright.config.js',
  );

/** The docs' checks against their deployment (DOCS_TEST_URL, else the docs origin), then every MCP server's tools. */
export function testRemote(): void {
  const origin = process.env.DOCS_TEST_URL ?? origins().docs;
  if (!origin) fail("docs test remote: DOCS_TEST_URL, or VITE_DOCS_ORIGIN in the app's .env");
  tool(bin('playwright'), ['test', '-c', docsChecks()], {
    env: { TEST_TARGET: 'remote', TEST_BASE_URL: origin },
  });
  // An API reference only when docs.config.ts names the contract it documents.
  const hasApi = /^\s*contract:\s*['"]/m.test(readFileSync(join(docs(), 'docs.config.ts'), 'utf8'));
  for (const server of ['docs', 'dev', ...(hasApi ? ['reference'] : [])])
    tool('pnpm', [
      'dlx',
      '@modelcontextprotocol/inspector@2.8.0',
      '--cli',
      `${origin}/api/mcp/${server}`,
      '--transport',
      'http',
      '--method',
      'tools/list',
    ]);
}
/** Ask AI's answers: off (an emergency stop, seconds, no build) or on again. */
export function answers(state: 'on' | 'off'): void {
  if (state === 'off') tool(bin('wrangler'), ['secret', 'put', 'ASK_PAUSED', '-c', 'wrangler.jsonc'], { input: '1' });
  else tool(bin('wrangler'), ['secret', 'delete', 'ASK_PAUSED', '-c', 'wrangler.jsonc']);
}
/**
 * The app's fixed questions (docs/content/questions.json): each must find its docs page among the top three
 * results of the AI Search index. Search only (`wrangler ai-search search`): no answer is written, so this
 * costs next to nothing and says whether retrieval is right. Results are R2 files (<site>/<lang>/<page>.md);
 * the docs table maps each back to its page, as the answer code does. Nothing without `ask`.
 */
export async function questions(): Promise<void> {
  const { docsConfig, table, questions: fixed } = await appDocs();
  const instance = docsConfig.ask?.instance;
  if (!instance) {
    console.log('docs questions: Ask AI is off (docs.config.ts has no `ask`).');
    return;
  }
  const { docsObjectForKey, docsUrl } = table;
  const search = (query: string) =>
    JSON.parse(wrangler('ai-search', 'search', instance, '--query', query, '--json')) as {
      chunks: { item: { key: string } }[];
    };
  const pageOf = (chunk: { item: { key: string } }) => {
    const object = docsObjectForKey(chunk.item.key);
    return object ? docsUrl(object.row.site, object.row.slug, object.lang) : `(not a docs page: ${chunk.item.key})`;
  };
  console.log(
    `Target: Cloudflare (remote), AI Search ${instance}: ${fixed.length} questions, search only (no answers written)`,
  );
  let failed = 0;
  for (const { question, finds } of fixed) {
    const page = finds.split('#')[0]!;
    const pages = [...new Set(search(question).chunks.map(pageOf))];
    const rank = pages.indexOf(page) + 1;
    const ok = rank > 0 && rank <= 3;
    if (!ok) failed++;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'}  ${question} -> ${page} ${rank ? `(rank ${rank})` : '(not found)'}${ok ? '' : `; top: ${pages.slice(0, 3).join(', ')}`}`,
    );
  }
  if (failed) fail(`docs questions: ${failed} of ${fixed.length} questions did not find their page`);
}
/** What this app's Ask AI needs on Cloudflare, from docs.config.ts's `ask`, as the commands that create it. Creates nothing: that costs money and is the owner's. */
export async function provision(): Promise<void> {
  const { docsConfig } = (await import(pathToFileURL(join(docs(), 'docs.config.ts')).href)) as {
    docsConfig: {
      ask?: { bucket: string; instance: string; gateway: string; rateLimitNamespace: string };
      service: string;
    };
  };
  const { ask, service } = docsConfig;
  if (!ask) {
    console.log('docs.config.ts has no `ask`: Ask AI is off, nothing to create.');
    return;
  }
  console.log(
    `Ask AI for ${service} needs, on the Cloudflare account wrangler is logged in to (nothing is created here):`,
  );
  console.log(`  1. the R2 bucket its pages go to:    pnpm wrangler r2 bucket create ${ask.bucket}`);
  console.log(
    `  2. the AI Search instance over it:   pnpm wrangler ai-search create ${ask.instance} --type r2 --source ${ask.bucket}`,
  );
  console.log(
    `  3. its AI Gateway, ${ask.gateway}: set it as the instance's gateway (dashboard: AI Search, ${ask.instance}, Settings), then pnpm remy docs observe gateway show`,
  );
  console.log(
    `  4. the rate limit: namespace ${ask.rateLimitNamespace}, a number unique on the account (Workers rate limiting needs no creating)`,
  );
  console.log(
    'Then the docs Worker, once deployed, puts its pages in the bucket itself (its DOCS_PAGES binding names the bucket).',
  );
}
export const what = "the docs Worker, @joeblew999/remy-ui's, over this app's docs/";
export const commands: Subcommands = {
  serve: {
    what: "the built docs here at DOCS_PREVIEW_PORT (4174), as their checks and AI tools see them: llms.txt, each page's .md (a Preview of a pushed branch is Cloudflare's)",
    run: () => serve(),
  },
  test: {
    what: "remote: the docs' browser checks against the deployment, with every MCP server's tools (the local build's: vp run test:docs)",
    run: (rest) => {
      if (rest[0] !== 'remote') fail('remy docs test remote (the local build: vp run test:docs)');
      testRemote();
    },
  },
  answers: {
    what: "on|off: Ask AI's answers resumed, or stopped in seconds",
    run: (rest) => {
      if (rest[0] !== 'on' && rest[0] !== 'off') fail('remy docs answers on|off');
      return answers(rest[0]);
    },
  },
  questions: {
    what: 'the fixed questions (docs/content/questions.json) each find their page in the index; search only',
    run: () => questions(),
  },
  provision: { what: 'what Ask AI needs on Cloudflare, printed, created never', run: () => provision() },
  observe: {
    what: "…: the docs Worker's logs and its AI Gateway (remy observe, with the docs' configuration)",
    run: (rest) => {
      process.chdir(docs());
      return observe([...rest, '--config', join(docs(), 'wrangler.jsonc')]);
    },
  },
};
export const main = dispatch('docs', commands);
