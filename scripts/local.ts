// remy-auth's local state before it runs (package.json "local"; remy app dev|build and remy flow start run it):
// .dev.vars with a local secret when missing, the local D1 databases migrated, and the guard's oRPC v1
// fixture installed. Nothing to remember.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (!existsSync('.dev.vars')) {
  writeFileSync('.dev.vars', `ENVIRONMENT=local\nBETTER_AUTH_SECRET=${randomBytes(32).toString('base64')}\n`);
  console.log('local: wrote .dev.vars (local environment, a new local secret).');
}
for (const db of ['DB', 'DEMO_DB']) execFileSync('./node_modules/.bin/wrangler', ['d1', 'migrations', 'apply', db, '--local'], { stdio: 'inherit' });
if (!existsSync('tests/guard/v1/node_modules')) {
  const result = spawnSync('npm', ['ci', '--prefix', 'tests/guard/v1', '--no-audit', '--no-fund', '--loglevel=error'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
