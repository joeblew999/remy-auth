// vp run ui:version <version>: the next release's version, written everywhere it appears: the
// package, the showcase's and the contract's peer range (they are written against this release's
// exports), the lockfile, and the blank app's two pins. Then template:check.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('vp run ui:version <version>: the next version without the v, e.g. 0.15.0');
  process.exit(2);
}
const npm = (...args: string[]) => execFileSync('npm', args, { stdio: ['ignore', 'ignore', 'inherit'] });
npm('pkg', 'set', `version=${version}`, '--workspace', '@joeblew999/remy-ui');
// The command line is released with the platform, under the same number.
npm('pkg', 'set', `version=${version}`, '--workspace', '@joeblew999/remy-cli');
npm('pkg', 'set', `peerDependencies.@joeblew999/remy-ui=>=${version}`, '--workspace', '@joeblew999/remy-showcase');
npm('pkg', 'set', `peerDependencies.@joeblew999/remy-ui=>=${version}`, '--workspace', '@joeblew999/remy-auth-contract');
// The showcase declares what it imports, at the platform's exact versions (tests/unit/showcase-deps.unit.spec.ts).
const platform = JSON.parse(readFileSync('packages/remy-ui/package.json', 'utf8')).dependencies as Record<
  string,
  string
>;
const showcase = JSON.parse(readFileSync('packages/remy-showcase/package.json', 'utf8')).dependencies as Record<
  string,
  string
>;
for (const name of Object.keys(showcase))
  if (platform[name] && platform[name] !== showcase[name])
    npm('pkg', 'set', `dependencies.${name}=${platform[name]}`, '--workspace', '@joeblew999/remy-showcase');
npm('install', '--package-lock-only', '--no-audit', '--no-fund', '--loglevel=error');
execFileSync(
  'npm',
  ['pkg', 'set', `dependencies.@joeblew999/remy-ui=${version}`, `dependencies.@joeblew999/remy-cli=${version}`],
  {
    cwd: 'template',
    stdio: ['ignore', 'ignore', 'inherit'],
  },
);
// The shared workflow is ci.yml from the release after 0.15.1 (it was google.yml): the new tag gets the new name.
if (existsSync('template/.github/workflows/ci.yml'))
  writeFileSync(
    'template/.github/workflows/ci.yml',
    readFileSync('template/.github/workflows/ci.yml', 'utf8').replace(
      /workflows\/(?:google|ci)\.yml@v\d+\.\d+\.\d+/g,
      `workflows/ci.yml@v${version}`,
    ),
  );
execFileSync(process.execPath, ['scripts/template-check.ts'], { stdio: 'inherit' });
