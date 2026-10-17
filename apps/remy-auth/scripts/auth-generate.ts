// vp run auth:generate <name>: what the Better Auth options need beyond migrations/, as the next
// numbered migration. The pinned CLI compares the options (src/auth/cli.ts) with a throwaway SQLite
// database built from migrations/, so it writes only what is not there yet; change the options, then
// generate, never edit Better Auth's tables by hand.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, renameSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const name = process.argv[2];
if (!name) {
  console.error('vp run auth:generate <name>: a name for the migration, e.g. organization');
  process.exit(2);
}
const sql = join(mkdtempSync(join(tmpdir(), 'auth-generate-')), 'schema.sql');
execFileSync('auth', ['generate', '--config', 'src/auth/cli.ts', '--output', sql, '--yes'], {
  stdio: 'inherit',
});
if (statSync(sql, { throwIfNoEntry: false })?.size === 0 || !statSync(sql, { throwIfNoEntry: false })) {
  console.log('auth:generate: migrations/ already holds the schema; nothing written.');
  process.exit(0);
}
execFileSync('wrangler', ['d1', 'migrations', 'create', 'DB', name], { stdio: 'ignore' });
const file = readdirSync('migrations')
  .filter((entry) => entry.endsWith(`_${name}.sql`))
  .sort()
  .at(-1);
if (!file) {
  console.error('auth:generate: wrangler wrote no migration file');
  process.exit(1);
}
renameSync(sql, join('migrations', file));
console.log(`auth:generate: wrote migrations/${file}; apply it with vp run local.`);
