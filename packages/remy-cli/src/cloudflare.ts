// Cloudflare. The one way anything is deployed is a push: Cloudflare's Git builds (Workers Builds) deploy main to
// production and every other branch to its Preview. Here, only what reads Cloudflare: what each deployment runs
// (`remy cloudflare versions`), an app's page URLs, and the check that a binding names a resource that exists.
import { quickLocales } from './test.ts';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dispatch, type Subcommands } from './commands.ts';
import { appDir, bin, origins as projectOrigins } from './config.ts';
// The commit each deploy's build names (build-vite.js): worked out here, outside the build, which never runs git.
import { gitStamp } from '@joeblew999/remy-ui/build/vite';

// A declaration, not a constant: tsc narrows after a call only to a function declared with its never type.
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** A tool from this install, in the foreground; stops the step at its first failure. */
function tool(name: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): void {
  const result = spawnSync(bin(name), args, {
    cwd: options.cwd ?? appDir(),
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) fail(`${name} ${args.join(' ')}: failed`);
}

/**
 * A binding in the Wrangler configuration that names no existing resource would make Wrangler create
 * one during the deploy (its automatic provisioning). Creating a database, a namespace or a bucket is
 * the owner's decision, so the deploy stops instead. The configuration read is the environment's being
 * deployed (CLOUDFLARE_ENV, as the Cloudflare Vite plugin selects it at build time), or the top level.
 */
export async function provisioned(environment = process.env.CLOUDFLARE_ENV || undefined): Promise<void> {
  const { unstable_readConfig } = (await import(
    pathToFileURL(createRequire(import.meta.url).resolve('wrangler')).href
  )) as typeof import('wrangler');
  const config = unstable_readConfig({ config: join(appDir(), 'wrangler.jsonc'), env: environment });
  type Binding = { binding: string };
  type D1 = Binding & { database_name?: string; database_id?: string };
  type KV = Binding & { id?: string };
  type R2 = Binding & { bucket_name?: string };
  const missing = [
    ...((config.d1_databases ?? []) as D1[])
      .filter((db) => !db.database_id)
      .map((db) => `D1 database ${db.binding} (${db.database_name ?? 'unnamed'}) has no database_id`),
    ...((config.kv_namespaces ?? []) as KV[])
      .filter((kv) => !kv.id)
      .map((kv) => `KV namespace ${kv.binding} has no id`),
    ...((config.r2_buckets ?? []) as R2[])
      .filter((bucket) => !bucket.bucket_name)
      .map((bucket) => `R2 bucket ${bucket.binding} has no bucket_name`),
  ];
  if (missing.length)
    fail(
      `Not deploying${environment ? ` ${environment}` : ''}: Wrangler would create these by itself.\n${missing.map((line) => `  ${line}`).join('\n')}\nCreate each on the owner's request and put its id in the Wrangler configuration.`,
    );
  databasesRight(
    unstable_readConfig({ config: join(appDir(), 'wrangler.jsonc') }) as Databases,
    config as Databases,
    environment,
  );
}

type Databases = {
  d1_databases?: { binding: string; database_name?: string; database_id?: string }[];
  previews?: Databases;
};
/** What Cloudflare says of one D1 database (wrangler d1 info --json): where its primary runs, and its read copies. */
export type DatabaseInfo = { name: string; running_in_region?: string; read_replication?: { mode?: string } };

/**
 * The platform's rule for every D1 database an app uses, the Previews' included: it keeps read copies
 * (@joeblew999/remy-ui/replicas reads through them), and it lives where production's first one does,
 * so no environment pays an ocean crossing per write that production does not. A rule, not settings:
 * Wrangler's configuration cannot record either (its D1 entries take a name, an id and migrations), so
 * nothing is written per database; production's database is the reference. One line per database that breaks it.
 */
export function databaseProblems(databases: DatabaseInfo[], reference: string | undefined): string[] {
  return databases.flatMap((db) => [
    ...(db.read_replication?.mode === 'auto'
      ? []
      : [
          `${db.name}: read replication ${db.read_replication?.mode ?? 'not reported'}; turn it on (dashboard: D1, the database, Settings, Read replication)`,
        ]),
    ...(reference && db.running_in_region && db.running_in_region !== reference
      ? [
          `${db.name}: runs in ${db.running_in_region}, production's in ${reference}; a database's region is chosen only when it is made, so make it again there (pnpm wrangler d1 create <name> --location ${reference.toLowerCase()}), migrate it, and put its id in wrangler.jsonc`,
        ]
      : []),
  ]);
}

/** Asks Cloudflare about every database production, this deployment and the Previews use, and refuses on any that breaks the rule. */
function databasesRight(production: Databases, deployed: Databases, environment?: string): void {
  const listed = [production, deployed, production.previews ?? {}]
    .flatMap((config) => config.d1_databases ?? [])
    .filter((db) => db.database_id);
  const unique = [...new Map(listed.map((db) => [db.database_id, db])).values()];
  const info = (id: string): DatabaseInfo =>
    JSON.parse(
      execFileSync(bin('wrangler'), ['d1', 'info', id, '--json'], {
        cwd: appDir(),
        encoding: 'utf8',
      }),
    );
  const infos = unique.map((db) => ({ ...info(db.database_id!), name: db.database_name ?? db.binding }));
  const reference = infos.find((db) => db.name === production.d1_databases?.[0]?.database_name)?.running_in_region;
  const problems = databaseProblems(infos, reference);
  if (problems.length)
    fail(
      `Not deploying${environment ? ` ${environment}` : ''}: these databases break the platform's rule (read copies, production's region).\n${problems.map((line) => `  ${line}`).join('\n')}`,
    );
  console.log(
    `${infos.length} database${infos.length === 1 ? '' : 's'}: read copies on, all in ${reference ?? 'one region'}.`,
  );
}

/** The smoke checks against a live origin: the deploy proves itself with the tools, not by hand. */
export const smoke = (origin: string): void =>
  tool('playwright', ['test', '--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], {
    env: { TEST_TARGET: 'remote', TEST_BASE_URL: origin },
  });

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** Where a deployed commit is from here; a deployment can be older or newer than the branch you hold. */
function distance(commit: string | undefined): string {
  if (!commit) return 'no commit in its stamp';
  if (!git('cat-file', '-t', commit)) return 'unknown to this checkout';
  const behind = git('rev-list', '--count', `${commit}..HEAD`);
  const ahead = git('rev-list', '--count', `HEAD..${commit}`);
  if (behind === '0' && ahead === '0') return '= HEAD';
  return [behind !== '0' && `${behind} behind HEAD`, ahead !== '0' && `${ahead} ahead of HEAD`]
    .filter(Boolean)
    .join(', ');
}

type Health = {
  service?: string;
  environment?: string;
  release?: string;
  deployedAt?: string;
  build?: { commit?: string; changes?: boolean };
  error?: string;
};

/**
 * Ask each deployment what it is running, one row each: service, environment, commit, how far that is
 * from this checkout, when it was deployed. Nothing is written down anywhere, so nothing can drift.
 */
export async function versions(
  origins = [projectOrigins().production, projectOrigins().docs].filter((o): o is string => !!o),
): Promise<{ table: string; unanswered: number }> {
  if (!origins.length) fail('versions: pass an origin, or put origins in remy.config.ts');
  const ask = async (origin: string): Promise<Health> => {
    try {
      const response = await fetch(new URL('/healthz', origin), {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok ? ((await response.json()) as Health) : { error: `HTTP ${response.status}` };
    } catch (error) {
      return {
        error:
          (error as { cause?: { code?: string } }).cause?.code ??
          (error instanceof Error ? error.message : String(error)),
      };
    }
  };
  const rows: string[][] = [['ORIGIN', 'SERVICE', 'ENVIRONMENT', 'COMMIT', 'FROM HERE', 'DEPLOYED', 'RELEASE']];
  let unanswered = 0;
  for (const [index, answer] of (await Promise.all(origins.map(ask))).entries()) {
    const origin = new URL(origins[index]!).origin;
    if (answer.error) {
      unanswered++;
      rows.push([origin, `no answer (${answer.error})`, '', '', '', '', '']);
      continue;
    }
    const { build } = answer;
    if (!build) {
      rows.push([
        origin,
        answer.service ?? '',
        '?',
        'no stamp',
        'deployed before the build stamp',
        '',
        answer.release ?? '',
      ]);
      continue;
    }
    const commit = build.commit ? `${build.commit.slice(0, 7)}${build.changes ? '+changes' : ''}` : '';
    rows.push([
      origin,
      answer.service ?? '',
      answer.environment ?? '',
      commit,
      distance(build.commit),
      (answer.deployedAt ?? '').slice(0, 16).replace('T', ' '),
      answer.release ?? '',
    ]);
  }
  const widths = rows[0]!.map((_, column) => Math.max(...rows.map((row) => row[column]!.length)));
  const lines = rows.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths[column]!))
      .join('  ')
      .trimEnd(),
  );
  if (git('status', '--porcelain'))
    lines.push('', 'This checkout has uncommitted changes: HEAD is its last commit, not what is on disk.');
  return { table: lines.join('\n'), unanswered };
}

/** The production (or a given) origin's pages and health URL, for reports: the package's paths in the base language. */
export async function urls(origin = projectOrigins().production): Promise<void> {
  if (!origin) fail('urls: pass an origin or put origins.production in remy.config.ts');
  const resolve = createRequire(join(process.cwd(), 'package.json')).resolve;
  const load = (specifier: string) => import(pathToFileURL(resolve(specifier)).href);
  const { sitePaths, appPaths } = (await load('@joeblew999/remy-ui/paths')) as {
    sitePaths: string[];
    appPaths: string[];
  };
  const { baseLocale, localizeUrl } = (await load('@joeblew999/remy-ui/runtime')) as {
    baseLocale: string;
    localizeUrl: (url: URL, options: { locale: string }) => URL;
  };
  const page = (path: string) => localizeUrl(new URL(path || '/', origin), { locale: baseLocale }).href;
  console.log(`Origin: ${new URL(origin).origin}`);
  console.log('Site pages:');
  for (const path of sitePaths) console.log(`  ${page(path)}`);
  console.log('App pages:');
  for (const path of appPaths) console.log(`  ${page(path)}`);
  console.log(`Health: ${new URL('/healthz', origin).href}`);
}

/** The Worker's name in the Wrangler configuration. */
async function workerConfig(): Promise<{ name: string; config: Record<string, unknown> }> {
  const { unstable_readConfig } = (await import(
    pathToFileURL(createRequire(import.meta.url).resolve('wrangler')).href
  )) as typeof import('wrangler');
  const config = unstable_readConfig({ config: join(appDir(), 'wrangler.jsonc') }) as Record<string, unknown>;
  const name = config.name as string | undefined;
  if (!name) fail('the Wrangler configuration has no Worker name');
  return { name, config };
}
const workerName = async (): Promise<string> => (await workerConfig()).name;

export const what =
  "Cloudflare's builds deploy every push (main to production, a branch to its Preview); here: what each deployment runs, its URLs, the resources a binding needs";
export const commands: Subcommands = {
  versions: {
    what: '[origins…]: what each deployment runs, asked and never remembered: service, environment, commit and how far it is from this checkout, when it was deployed',
    run: async (rest) => {
      const { table, unanswered } = await versions(rest.length ? rest : undefined);
      console.log(table);
      if (unanswered) process.exit(1);
    },
  },
  urls: {
    what: '[origin]: the URLs a deployment answers at',
    run: async (rest) => {
      await urls(rest[0]);
    },
  },
  provisioned: {
    what: "refuse when a D1, KV or R2 binding names no existing resource, or a D1 database (the Previews' included) keeps no read copies",
    run: () => provisioned(),
  },
};
export const main = dispatch('cloudflare', commands);
