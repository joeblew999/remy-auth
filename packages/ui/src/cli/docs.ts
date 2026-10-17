// The docs Worker, @joeblew999/remy-ui's, over an app's docs/ (`remy docs …`, npx remy docs): run it
// (dev), build and check it, test it locally or against its deployment (every MCP server's tools
// included), a preview Worker, Ask AI's answers paused or resumed (an emergency stop, seconds), its
// pages published to the index, what Ask AI needs on Cloudflare (printed, created never), its logs and
// its gateway (observe.ts, with the docs Worker's generated configuration), and starting an app's docs.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  return docsDir() ?? fail('this app has no docs/ (remy docs init <ref> starts one)');
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
 * The app's docs as the publish and the questions read them from the file system: its docs/docs.config.ts
 * (Node runs TypeScript itself), the docs table over its docs/content (the package's table-core, the one the
 * docs Worker builds its pages and reads citations with) and its fixed Ask AI questions (docs/content/questions.json).
 */
async function appDocs(): Promise<{
  docsConfig: DocsConfig;
  table: import('../docs/docs/table-core.js').DocsTable;
  questions: Question[];
}> {
  const root = process.cwd();
  const json = (file: string) => JSON.parse(readFileSync(join(docs(), file), 'utf8'));
  const { docsConfig } = (await import(pathToFileURL(join(docs(), 'docs.config.ts')).href)) as {
    docsConfig: DocsConfig;
  };
  const { docsTableOf } = (await import(
    pathToFileURL(join(root, 'node_modules', '@joeblew999', 'remy-ui', 'src', 'docs', 'docs', 'table-core.js')).href
  )) as typeof import('../docs/docs/table-core.js');
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
/** The docs Worker's generated configuration (vite.config.ts writes .remy-docs/ when run). */
const generated = (): string => {
  execFileSync(process.execPath, ['vite.config.ts'], { cwd: docs(), stdio: 'ignore' });
  return '.remy-docs/wrangler.json';
};
const previewName = () =>
  `${(JSON.parse(readFileSync(join(docs(), '.remy-docs', 'wrangler.json'), 'utf8')) as { name: string }).name}-preview`;

/**
 * The docs' production build must already be there (the docs package's build task: vp run check builds it, and a
 * task that needs it names it in its dependsOn): a docs command never builds by itself, so nothing builds twice and
 * nothing builds out of Vite Plus's sight (2026-10-17: the skill rebuilt the whole site on every new-app run).
 */
export function built(): void {
  if (!existsSync(join(docs(), 'dist', 'server', 'wrangler.json')))
    fail(
      `docs: no build in ${relative(process.cwd(), docs()) || '.'}/dist: vp run check builds it (the docs' build task).`,
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

/** The docs' Playwright configuration, in the installed package: node_modules found upward, as bin() finds tools (apps/docs in remy-auth, docs/ in an app). */
const docsChecks = (): string =>
  join(dirname(dirname(bin('playwright'))), '@joeblew999', 'remy-ui', 'src', 'docs', 'playwright.config.js');

/** The docs' browser checks on a local build, at the docs preview port. */
export function test(): void {
  built();
  tool(bin('playwright'), ['test', '-c', docsChecks(), '--project=ours'], {
    env: { PREVIEW_PORT: String(ports().docsPreview) },
  });
}
/** The docs' checks against their deployment (DOCS_TEST_URL, else the docs origin), then every MCP server's tools. */
export function testRemote(): void {
  const origin = process.env.DOCS_TEST_URL ?? origins().docs;
  if (!origin) fail('docs test remote: DOCS_TEST_URL, or origins.docs in remy.config.ts');
  generated();
  tool(bin('playwright'), ['test', '-c', docsChecks()], {
    env: { TEST_TARGET: 'remote', TEST_BASE_URL: origin },
  });
  const hasApi = (JSON.parse(readFileSync(join(docs(), '.remy-docs', 'app.json'), 'utf8')) as { api?: unknown }).api;
  for (const server of ['docs', 'dev', ...(hasApi ? ['reference'] : [])])
    tool('npx', [
      '-y',
      '@modelcontextprotocol/inspector@2.8.0',
      '--cli',
      `${origin}/api/mcp/${server}`,
      '--transport',
      'http',
      '--method',
      'tools/list',
    ]);
}
/** A preview Worker of the docs, answers paused. */
export function preview(): void {
  built();
  generated();
  const name = previewName();
  tool(bin('wrangler'), ['deploy', '-c', 'dist/server/wrangler.json', '--name', name]);
  tool(bin('wrangler'), ['secret', 'put', 'ASK_PAUSED', '-c', '.remy-docs/wrangler.json', '--name', name], {
    input: '1',
  });
}
/** Ask AI's answers: off (an emergency stop, seconds, no build) or on again. */
export function answers(state: 'on' | 'off'): void {
  generated();
  if (state === 'off')
    tool(bin('wrangler'), ['secret', 'put', 'ASK_PAUSED', '-c', '.remy-docs/wrangler.json'], { input: '1' });
  else tool(bin('wrangler'), ['secret', 'delete', 'ASK_PAUSED', '-c', '.remy-docs/wrangler.json']);
}
/**
 * Ask AI's pages (.plans/docs-ai-sync.md, route B): make the R2 bucket hold exactly the current docs, one
 * file per page (<site>/<lang>/<page>.md, each fetched from the live docs Worker as Fumadocs renders it for
 * tools: frontmatter out, includes resolved, in every language the page has its own text in), delete what
 * is no longer a page (Wrangler cannot list a bucket: Cloudflare's R2 API does, with Wrangler's login), ask
 * AI Search to sync now and wait for that sync (minutes), then check the fixed questions find their pages
 * (questions). Nothing without `ask`. Production, after the docs deploy (vp run promote runs it).
 */
export async function publish(): Promise<void> {
  const { docsConfig, table } = await appDocs();
  if (!docsConfig.ask) {
    console.log('docs publish: Ask AI is off (docs.config.ts has no `ask`); nothing to publish.');
    return;
  }
  const { bucket, instance } = docsConfig.ask;
  const origin = origins().docs;
  if (!origin)
    fail(
      'docs publish: DOCS_ORIGIN (origins.docs in remy.config.ts) is the live docs Worker whose .md pages it publishes',
    );
  const token = (JSON.parse(wrangler('auth', 'token', '--json')) as { token: string }).token;
  const account = (JSON.parse(wrangler('whoami', '--json')) as { accounts: { id: string }[] }).accounts[0]!.id;
  console.log(`Target: Cloudflare (remote), R2 bucket ${bucket} (PRODUCTION), then AI Search ${instance}`);
  // Keys from the one rule the answer code reads back for citations (docsObjectKey): <site>/<lang>/<page>.md.
  const { docsLangs, docsObjectKey, docsTable, docsUrl } = table;
  const wanted = new Map(
    docsTable.flatMap((row) =>
      docsLangs(row, existsSync).map(
        (lang) =>
          [
            docsObjectKey(row.site, row.slug, lang),
            `${origin}${docsUrl(row.site, row.slug || 'index', lang)}.md`,
          ] as const,
      ),
    ),
  );
  const dir = mkdtempSync(join(tmpdir(), 'docs-publish-'));
  for (const [key, url] of wanted) {
    const response = await fetch(url);
    if (!response.ok) fail(`docs publish: ${url}: ${response.status}`);
    const file = join(dir, key.replaceAll('/', '_'));
    writeFileSync(file, await response.text());
    wrangler('r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', 'text/markdown', '--remote');
    console.log(`  put     ${key} <- ${url}`);
  }
  const listed: string[] = [];
  for (let cursor: string | undefined; ;) {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects`);
    if (cursor) url.searchParams.set('cursor', cursor);
    const body = (await (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).json()) as {
      success: boolean;
      errors?: unknown;
      result: { key: string }[];
      result_info?: { cursor?: string; is_truncated?: boolean };
    };
    if (!body.success) fail(`docs publish: list ${bucket}: ${JSON.stringify(body.errors)}`);
    listed.push(...body.result.map((object) => object.key));
    cursor = body.result_info?.cursor;
    if (!body.result_info?.is_truncated) break;
  }
  for (const key of listed.filter((key) => !wanted.has(key))) {
    wrangler('r2', 'object', 'delete', `${bucket}/${key}`, '--remote');
    console.log(`  deleted ${key} (no longer a docs page)`);
  }
  console.log(`${bucket} holds exactly the ${wanted.size} docs pages (English and translations).`);
  await synced(instance);
  await questions();
}

type SyncJob = { id: string; source: string; started_at: string; ended_at: string | null };
const syncJobs = (instance: string): SyncJob[] =>
  JSON.parse(wrangler('ai-search', 'jobs', 'list', instance, '--json')) as SyncJob[];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Ask AI Search to sync the bucket now, then wait until that sync has ended: answers and the questions
 * check use the new files only once it has (a sync of remy-auth's docs takes three to four minutes; on
 * 2026-10-11 the questions were asked seconds after the sync started, against the old index, and failed).
 * When a sync is already running (the hourly one, or the first after creation) it picks the files up, so
 * that one is waited for instead.
 */
async function synced(instance: string): Promise<void> {
  const before = new Set(syncJobs(instance).map((job) => job.id));
  let created = true;
  try {
    wrangler('ai-search', 'jobs', 'create', instance);
    console.log(`Sync started for ${instance}.`);
  } catch (error) {
    created = false;
    const reason =
      String((error as { stderr?: string }).stderr ?? (error as Error).message)
        .split('\n')
        .find((line) => /error|✘/i.test(line)) ?? 'unknown';
    // Wrangler colours its error lines: the escape character is the point, to strip its SGR codes.
    // oxlint-disable-next-line eslint/no-control-regex -- matches ANSI colour codes (ESC [ ... m) on purpose
    console.log(`No new sync started (${reason.replace(/\x1b\[[0-9;]*m/g, '').trim()}); waiting for the running one.`);
  }
  const deadline = Date.now() + 15 * 60_000;
  for (let polls = 0; ; polls++) {
    const jobs = syncJobs(instance);
    const watched = created ? jobs.filter((job) => !before.has(job.id)) : jobs.filter((job) => !job.ended_at);
    if (watched.length > 0 && watched.every((job) => job.ended_at)) break;
    if (!created && watched.length === 0) break;
    if (Date.now() > deadline)
      fail(
        `docs publish: the sync of ${instance} is still running after 15 minutes (npx wrangler ai-search jobs list ${instance})`,
      );
    if (polls % 6 === 0)
      console.log(`  waiting for the sync of ${instance} (${watched.length ? 'running' : 'not listed yet'})…`);
    await sleep(10_000);
  }
  console.log(`Sync of ${instance} finished; answers use the new files.`);
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
  console.log(`  1. the R2 bucket its pages go to:    npx wrangler r2 bucket create ${ask.bucket}`);
  console.log(
    `  2. the AI Search instance over it:   npx wrangler ai-search create ${ask.instance} --type r2 --source ${ask.bucket}`,
  );
  console.log(
    `  3. its AI Gateway, ${ask.gateway}: set it as the instance's gateway (dashboard: AI Search, ${ask.instance}, Settings), then npx remy docs observe gateway show`,
  );
  console.log(
    `  4. the rate limit: namespace ${ask.rateLimitNamespace}, a number unique on the account (Workers rate limiting needs no creating)`,
  );
  console.log('Then vp run promote: it deploys the docs and publishes the pages to the bucket.');
}
/** The docs app for a new repository, from remy-auth's template at a tag. */
export function init(ref: string | undefined): void {
  if (!ref)
    fail(
      'remy docs init <ref>: the remy-auth tag to take the docs app from, e.g. v0.14.0 (match your @joeblew999/remy-ui version)',
    );
  if (existsSync('docs')) fail('docs/ exists already');
  const result = spawnSync('npx', ['-y', 'giget@3.3.1', `gh:joeblew999/remy-auth/template/docs#${ref}`, 'docs'], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export const what = "the docs Worker, @joeblew999/remy-ui's, over this app's docs/";
export const commands: Subcommands = {
  serve: {
    what: "the built docs here at DOCS_PREVIEW_PORT (4174), as their checks and AI tools see them: llms.txt, each page's .md (preview is Cloudflare's)",
    run: () => serve(),
  },
  test: {
    what: "[remote]: the docs' browser checks on a local build, or against the deployment with every MCP server's tools",
    run: (rest) => (rest[0] === 'remote' ? testRemote() : test()),
  },
  preview: { what: 'a preview Worker of the docs, answers paused', run: () => preview() },
  answers: {
    what: "on|off: Ask AI's answers resumed, or stopped in seconds",
    run: (rest) => {
      if (rest[0] !== 'on' && rest[0] !== 'off') fail('remy docs answers on|off');
      return answers(rest[0]);
    },
  },
  publish: {
    what: "the bucket holds exactly the live docs pages, the index's sync waited for, then the fixed questions (vp run promote runs it)",
    run: () => publish(),
  },
  questions: {
    what: 'the fixed questions (docs/content/questions.json) each find their page in the index; search only',
    run: () => questions(),
  },
  provision: { what: 'what Ask AI needs on Cloudflare, printed, created never', run: () => provision() },
  init: { what: "<ref>: a docs/ for this app from remy-auth's template at that tag", run: (rest) => init(rest[0]) },
  observe: {
    what: "…: the docs Worker's logs and its AI Gateway (remy observe, with the docs' configuration)",
    run: (rest) => {
      generated();
      process.chdir(docs());
      return observe([...rest, '--config', join(docs(), '.remy-docs', 'wrangler.json')]);
    },
  },
};
export const main = dispatch('docs', commands);
