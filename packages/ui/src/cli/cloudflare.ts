// Cloudflare, as functions of the steps (`remy flow land` deploys staging, `remy flow promote` production and
// the docs; `remy flow status` asks what each deployment runs): the deploy, the check that nothing would be
// created by it, the wait for the new version, what runs where, and an app's page URLs. By hand, the
// same through `remy cloudflare <deploy|staging|versions|urls|docs-deploy>`. Wrangler does the work.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { publish } from './docs.ts';
import { prepare } from './dev.ts';
import { dispatch, type Subcommands } from './commands.ts';

// A declaration, not a constant: tsc narrows after a call only to a function declared with its never type.
function fail(message: string): never { console.error(message); process.exit(1); }

/** A tool from this install, in the foreground; stops the step at its first failure. */
function tool(name: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): void {
  const result = spawnSync(join(process.cwd(), 'node_modules', '.bin', name), args, { cwd: options.cwd, stdio: 'inherit', env: { ...process.env, ...options.env } });
  if (result.status !== 0) fail(`${name} ${args.join(' ')}: failed`);
}

/**
 * A binding in the Wrangler configuration that names no existing resource would make Wrangler create
 * one during the deploy (its automatic provisioning). Creating a database, a namespace or a bucket is
 * the owner's decision, so the deploy stops instead. The configuration read is the environment's being
 * deployed (CLOUDFLARE_ENV, as the Cloudflare Vite plugin selects it at build time), or the top level.
 */
export async function provisioned(environment = process.env.CLOUDFLARE_ENV || undefined): Promise<void> {
  const { unstable_readConfig } = await import(pathToFileURL(createRequire(join(process.cwd(), 'package.json')).resolve('wrangler')).href) as typeof import('wrangler');
  const config = unstable_readConfig({ env: environment });
  type Binding = { binding: string };
  type D1 = Binding & { database_name?: string; database_id?: string };
  type KV = Binding & { id?: string };
  type R2 = Binding & { bucket_name?: string };
  const missing = [
    ...((config.d1_databases ?? []) as D1[]).filter(db => !db.database_id).map(db => `D1 database ${db.binding} (${db.database_name ?? 'unnamed'}) has no database_id`),
    ...((config.kv_namespaces ?? []) as KV[]).filter(kv => !kv.id).map(kv => `KV namespace ${kv.binding} has no id`),
    ...((config.r2_buckets ?? []) as R2[]).filter(bucket => !bucket.bucket_name).map(bucket => `R2 bucket ${bucket.binding} has no bucket_name`),
  ];
  if (missing.length) fail(`Not deploying${environment ? ` ${environment}` : ''}: Wrangler would create these by itself.\n${missing.map(line => `  ${line}`).join('\n')}\nCreate each on the owner's request and put its id in the Wrangler configuration.`);
}

/** The entries Wrangler writes to WRANGLER_OUTPUT_FILE_PATH, as far as this reads them. */
type WranglerEntry = { type: string; version_id?: string; preview_alias_url?: string };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait until <origin>/healthz reports the Worker version Wrangler recorded in its output file (up to
 * 60 s), then until this build's entry script is served three times in a row (static assets spread
 * across the edge separately). Cloudflare rolls a version out over a few seconds; a check that started
 * earlier would test the previous one.
 */
export async function waitFor(origin: string, output: string): Promise<void> {
  const entries: WranglerEntry[] = readFileSync(output, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const entry = entries.filter(e => e.type === 'deploy' || e.type === 'version-upload').at(-1);
  const version = entry?.version_id;
  if (!entry || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(version ?? '')) fail(`wait: no Worker version ID in ${output}; did the Wrangler upload succeed?`);
  if (entry.preview_alias_url && new URL(entry.preview_alias_url).origin !== new URL(origin).origin) fail(`wait: Wrangler published the preview at ${entry.preview_alias_url}, not ${origin}`);
  const attempts = 30;
  let last = 'no answer';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(new URL('/healthz', origin), { cache: 'no-store' });
      const release = response.ok ? ((await response.json()) as { release?: string }).release : undefined;
      if (release === version) { console.log(`${origin} serves version ${version}.`); break; }
      last = response.ok ? `release ${release}` : `HTTP ${response.status}`;
    } catch (error) { last = error instanceof Error ? error.message : String(error); }
    if (attempt === attempts) fail(`wait: ${origin}/healthz did not report version ${version} within ${attempts * 2} s (last: ${last})`);
    await sleep(2000);
  }
  const asset = existsSync('dist/client/assets') ? readdirSync('dist/client/assets').find(name => /^index-[\w-]+\.js$/.test(name)) : undefined;
  if (!asset) return;
  let streak = 0;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(new URL(`/assets/${asset}`, origin), { cache: 'no-store' }).catch(() => undefined);
    streak = response?.ok ? streak + 1 : 0;
    if (streak === 3) { console.log(`${origin} serves this build's assets (${asset}).`); break; }
    if (attempt === attempts) fail(`wait: ${origin} did not serve this build's /assets/${asset} within ${attempts} s`);
    await sleep(1000);
  }
  // The first page a check opens needs every chunk it references, each cold at the edge after a deploy:
  // twice (2026-10-10, 2026-10-11) the smoke's hydration wait ran out on that first load and passed
  // a minute later. So the wait ends only when the home page's every asset answers.
  const home = await fetch(new URL('/', origin), { cache: 'no-store', redirect: 'follow' }).then(response => (response.ok ? response.text() : '')).catch(() => '');
  const refs = [...new Set([...home.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]!))];
  for (let attempt = 1; attempt <= attempts && refs.length; attempt++) {
    const answers = await Promise.all(refs.map(path => fetch(new URL(path, origin), { cache: 'no-store' }).then(response => response.ok).catch(() => false)));
    if (answers.every(Boolean)) { console.log(`${origin} serves the home page's ${refs.length} assets.`); return; }
    if (attempt === attempts) fail(`wait: ${origin} did not serve all ${refs.length} assets of its home page within ${attempts} s`);
    await sleep(1000);
  }
}

/** The smoke checks against a live origin: the deploy proves itself with the tools, not by hand. */
export const smoke = (origin: string): void => tool('playwright', ['test', '--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], { env: { TEST_TARGET: 'remote', TEST_BASE_URL: origin } });

/**
 * Deploy the app: build with the public origin, upload to the authenticated Cloudflare account, wait
 * until the origin serves the new version, then the live smoke. No tests before it: what ran is the
 * flow's decision. With an environment (staging), the Cloudflare Vite plugin builds that named
 * environment of the Wrangler configuration and the upload is its Worker.
 */
export async function deploy(environment?: 'staging'): Promise<void> {
  const origin = environment === 'staging' ? process.env.STAGING_ORIGIN : process.env.DEPLOY_ORIGIN;
  if (!origin) fail(`deploy: ${environment === 'staging' ? 'origins.staging' : 'origins.production'} is not in remy.config.ts`);
  const env: Record<string, string> = environment ? { CLOUDFLARE_ENV: environment, DEPLOY_ORIGIN: origin } : {};
  Object.assign(process.env, env);
  await provisioned(environment);
  prepare();
  tool('vite', ['build'], { env: { ...env, PUBLIC_ORIGIN: origin } });
  await provisioned(environment);
  const scratch = mkdtempSync(join(tmpdir(), 'remy-deploy-'));
  try {
    const output = join(scratch, 'wrangler.ndjson');
    tool('wrangler', ['deploy'], { env: { ...env, WRANGLER_OUTPUT_FILE_PATH: output } });
    await waitFor(origin, output);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
  console.log(`Live${environment ? ` (${environment})` : ''}: ${origin}`);
  smoke(origin);
}

/** The docs Worker: build, deploy, then publish the pages to Ask AI's index where the app has one. */
export async function deployDocs(): Promise<void> {
  if (!existsSync('docs')) return;
  const docsOrigin = process.env.DOCS_ORIGIN;
  if (!docsOrigin) fail('deploy docs: origins.docs is not in remy.config.ts');
  tool('vite', ['build'], { cwd: 'docs' });
  tool('wrangler', ['deploy', '-c', 'dist/server/wrangler.json'], { cwd: 'docs' });
  // Ask AI's pages, from the Worker just deployed: the bucket, the index's sync waited for, the fixed questions (docs.ts).
  await publish();
  console.log(`Live: ${docsOrigin}/docs (product guide), ${docsOrigin}/dev (developer docs), ${docsOrigin}/reference (API reference), ${docsOrigin}/llms.txt`);
}

const git = (...args: string[]) => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

/** Where a deployed commit is from here; a deployment can be older or newer than the branch you hold. */
function distance(commit: string | undefined): string {
  if (!commit) return 'no commit in its stamp';
  if (!git('cat-file', '-t', commit)) return 'unknown to this checkout';
  const behind = git('rev-list', '--count', `${commit}..HEAD`);
  const ahead = git('rev-list', '--count', `HEAD..${commit}`);
  if (behind === '0' && ahead === '0') return '= HEAD';
  return [behind !== '0' && `${behind} behind HEAD`, ahead !== '0' && `${ahead} ahead of HEAD`].filter(Boolean).join(', ');
}

type Health = { service?: string; environment?: string; release?: string; deployedAt?: string; build?: { commit?: string; changes?: boolean }; error?: string };

/**
 * Ask each deployment what it is running, one row each: service, environment, commit, how far that is
 * from this checkout, when it was deployed. Nothing is written down anywhere, so nothing can drift.
 */
export async function versions(origins = [process.env.DEPLOY_ORIGIN, process.env.STAGING_ORIGIN, process.env.DOCS_ORIGIN].filter((o): o is string => !!o)): Promise<{ table: string; unanswered: number }> {
  if (!origins.length) fail('versions: pass an origin, or put origins in remy.config.ts');
  const ask = async (origin: string): Promise<Health> => {
    try {
      const response = await fetch(new URL('/healthz', origin), { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      return response.ok ? await response.json() as Health : { error: `HTTP ${response.status}` };
    } catch (error) { return { error: (error as { cause?: { code?: string } }).cause?.code ?? (error instanceof Error ? error.message : String(error)) }; }
  };
  const rows: string[][] = [['ORIGIN', 'SERVICE', 'ENVIRONMENT', 'COMMIT', 'FROM HERE', 'DEPLOYED', 'RELEASE']];
  let unanswered = 0;
  for (const [index, answer] of (await Promise.all(origins.map(ask))).entries()) {
    const origin = new URL(origins[index]!).origin;
    if (answer.error) { unanswered++; rows.push([origin, `no answer (${answer.error})`, '', '', '', '', '']); continue; }
    const { build } = answer;
    if (!build) { rows.push([origin, answer.service ?? '', '?', 'no stamp', 'deployed before the build stamp', '', answer.release ?? '']); continue; }
    const commit = build.commit ? `${build.commit.slice(0, 7)}${build.changes ? '+changes' : ''}` : '';
    rows.push([origin, answer.service ?? '', answer.environment ?? '', commit, distance(build.commit), (answer.deployedAt ?? '').slice(0, 16).replace('T', ' '), answer.release ?? '']);
  }
  const widths = rows[0]!.map((_, column) => Math.max(...rows.map(row => row[column]!.length)));
  const lines = rows.map(row => row.map((cell, column) => cell.padEnd(widths[column]!)).join('  ').trimEnd());
  if (git('status', '--porcelain')) lines.push('', 'This checkout has uncommitted changes: HEAD is its last commit, not what is on disk.');
  return { table: lines.join('\n'), unanswered };
}

/** The production (or a given) origin's pages and health URL, for reports: the package's paths in the base language. */
export async function urls(origin = process.env.DEPLOY_ORIGIN): Promise<void> {
  if (!origin) fail('urls: pass an origin or put origins.production in remy.config.ts');
  const resolve = createRequire(join(process.cwd(), 'package.json')).resolve;
  const load = (specifier: string) => import(pathToFileURL(resolve(specifier)).href);
  const { sitePaths, appPaths } = await load('@joeblew999/remy-ui/paths') as { sitePaths: string[]; appPaths: string[] };
  const { baseLocale, localizeUrl } = await load('@joeblew999/remy-ui/runtime') as { baseLocale: string; localizeUrl: (url: URL, options: { locale: string }) => URL };
  const page = (path: string) => localizeUrl(new URL(path || '/', origin), { locale: baseLocale }).href;
  console.log(`Origin: ${new URL(origin).origin}`);
  console.log('Site pages:'); for (const path of sitePaths) console.log(`  ${page(path)}`);
  console.log('App pages:'); for (const path of appPaths) console.log(`  ${page(path)}`);
  console.log(`Health: ${new URL('/healthz', origin).href}`);
}

/** The Worker's name in the Wrangler configuration. */
async function workerConfig(): Promise<{ name: string; config: Record<string, unknown> }> {
  const { unstable_readConfig } = await import(pathToFileURL(createRequire(join(process.cwd(), 'package.json')).resolve('wrangler')).href) as typeof import('wrangler');
  const config = unstable_readConfig({}) as Record<string, unknown>;
  const name = config.name as string | undefined;
  if (!name) fail('the Wrangler configuration has no Worker name');
  return { name, config };
}
const workerName = async (): Promise<string> => (await workerConfig()).name;

/**
 * Deploy this commit as a throwaway Worker <worker>-check-<alias> (production untouched), wait until it
 * serves this build, run level 1 against it in the quick languages, then delete it (or keep it, for
 * the speed measurement). A Worker of its own, because preview URLs are off (every old version and
 * alias was public) and `wrangler delete` removes it completely. Answers the preview's origin.
 */
export async function preview(alias?: string, keep = false): Promise<string> {
  const { name: worker, config } = await workerConfig();
  const host = (process.env.DEPLOY_ORIGIN ?? '').replace(/^https:\/\//, '');
  if (!host.startsWith(`${worker}.`) || !host.endsWith('.workers.dev')) fail(`preview needs origins.production on workers.dev as https://${worker}.<subdomain>.workers.dev (got ${process.env.DEPLOY_ORIGIN})`);
  const part = (alias ?? execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim()).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  const name = `${worker}-check-${part}`;
  const origin = `https://${name}.${host.slice(worker.length + 1)}`;
  console.log(`Target: Cloudflare (remote), throwaway Worker ${name} at ${origin}`);
  const remove = async () => { await previewDelete(name).catch(error => console.error(`preview: could not delete ${name}: ${error instanceof Error ? error.message : String(error)}`)); };
  try {
    prepare();
    tool('vite', ['build'], { env: { PUBLIC_ORIGIN: origin } });
    await provisioned();
    const scratch = mkdtempSync(join(tmpdir(), 'remy-preview-'));
    try {
      const output = join(scratch, 'wrangler.ndjson');
      // A Worker of its own has no secrets: each one the configuration requires gets a random value of its
      // own, so the preview runs (a session made on it means nothing anywhere else).
      const required = (config as { secrets?: { required?: string[] } }).secrets?.required ?? [];
      const secrets = join(scratch, 'secrets.env');
      writeFileSync(secrets, required.map(name => `${name}=${randomBytes(32).toString('base64')}`).join('\n') + '\n');
      tool('wrangler', ['deploy', '--name', name, ...(required.length ? ['--secrets-file', secrets] : [])], { env: { WRANGLER_OUTPUT_FILE_PATH: output } });
      await waitFor(origin, output);
    } finally { rmSync(scratch, { recursive: true, force: true }); }
    // A brand-new workers.dev name answers 404 from some places for a while: wait for ten answers in a row.
    let ok = 0;
    for (let attempt = 0; attempt < 120 && ok < 10; attempt++) {
      ok = (await fetch(new URL('/healthz', origin), { cache: 'no-store' }).then(response => response.status === 200).catch(() => false)) ? ok + 1 : 0;
      if (ok < 10) await sleep(1000);
    }
    if (ok < 10) fail(`preview: ${origin} did not answer steadily within 2 minutes`);
    tool('playwright', ['test', '--project=ours'], { env: { TEST_BASE_URL: origin, TEST_TARGET: 'remote', CHECK_LOCALES: process.env.CHECK_LOCALES ?? process.env.QUICK_LOCALES ?? 'en,ar' } });
    console.log(`Preview passed level 1: ${origin}`);
    return origin;
  } finally { if (!keep) await remove(); }
}

/** Delete a throwaway check Worker by its full name; with none, list them. Never the production Worker. */
export async function previewDelete(name?: string): Promise<void> {
  const worker = await workerName();
  const wrangler = (...args: string[]) => execFileSync(join(process.cwd(), 'node_modules', '.bin', 'wrangler'), args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (!name) {
    console.log(`Check Workers of ${worker} on Cloudflare:`);
    const token = (JSON.parse(wrangler('auth', 'token', '--json')) as { token: string }).token;
    const account = (JSON.parse(wrangler('whoami', '--json')) as { accounts: { id: string }[] }).accounts[0]!.id;
    const answer = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts`, { headers: { Authorization: `Bearer ${token}` } })).json() as { result?: { id: string }[] };
    for (const script of answer.result ?? []) if (script.id.startsWith(`${worker}-check-`)) console.log(`  ${script.id}`);
    return;
  }
  if (!name.startsWith(`${worker}-check-`) || name === `${worker}-check-`) fail(`preview-delete only deletes check Workers named ${worker}-check-<name> (got ${name})`);
  console.log(`Target: Cloudflare (remote), deleting Worker ${name}`);
  tool('wrangler', ['delete', '--name', name, '--force']);
}

export const what = 'Cloudflare: production and staging deploys, the docs Worker, throwaway previews, what each deployment runs';
export const commands: Subcommands = {
  deploy: { what: 'production from this checkout, then the live smoke (dev:promote runs it)', run: () => deploy() },
  staging: { what: "the Wrangler configuration's env.staging to origins.staging (dev:land runs it)", run: () => deploy('staging') },
  'docs-deploy': { what: "the docs Worker, then its pages to Ask AI's index (dev:promote runs it)", run: () => deployDocs() },
  versions: { what: '[origins…]: a row per deployment, each commit placed against this checkout', run: async rest => { const { table, unanswered } = await versions(rest.length ? rest : undefined); console.log(table); if (unanswered) process.exit(1); } },
  urls: { what: '[origin]: the URLs a deployment answers at', run: async rest => { await urls(rest[0]); } },
  preview: { what: '[alias] [--keep]: a throwaway Worker <name>-check-<alias> with this build, deleted after its checks unless kept', run: async rest => { await preview(rest.find(part => !part.startsWith('--')), rest.includes('--keep')); } },
  'preview-delete': { what: '[name]: delete a preview Worker', run: rest => previewDelete(rest[0]) },
  wait: { what: '<origin> <wrangler-output-file>: until the origin serves the uploaded version, every home-page asset included', run: rest => { const [origin, output] = rest; if (!origin || !output) fail('remy cloudflare wait <origin> <wrangler-output-file>'); return waitFor(origin, output); } },
  provisioned: { what: 'refuse when a D1, KV or R2 binding names no existing resource', run: () => provisioned() },
};
export const main = dispatch('cloudflare', commands);
