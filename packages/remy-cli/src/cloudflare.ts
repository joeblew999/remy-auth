// Cloudflare. The one way anything is deployed is a push: Cloudflare's Git builds (Workers Builds) deploy main to
// production and every other branch to its Preview. What each deployment runs is Wrangler's (`wrangler deployments
// list`, `curl <origin>/healthz`). Here, only the check that a binding names a resource that exists.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dispatch, type Subcommands } from './commands.ts';
import { appDir, bin } from './config.ts';

// A declaration, not a constant: tsc narrows after a call only to a function declared with its never type.
function fail(message: string): never {
  console.error(message);
  process.exit(1);
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
      `Missing${environment ? ` in ${environment}` : ''}: Wrangler would create these by itself on Cloudflare's build.\n${missing.map((line) => `  ${line}`).join('\n')}\nCreate each on the owner's request and put its id in the Wrangler configuration.`,
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

export const what =
  "Cloudflare's builds deploy every push (main to production, a branch to its Preview); here: the resources a binding needs";
export const commands: Subcommands = {
  provisioned: {
    what: "refuse when a D1, KV or R2 binding names no existing resource, or a D1 database (the Previews' included) keeps no read copies",
    run: () => provisioned(),
  },
};
export const main = dispatch('cloudflare', commands);
