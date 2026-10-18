// vp run ui:version <version>: the next release's version, written everywhere it appears: the platform package and
// its command line (released together under one number), the showcase's and the contract's peer range (they are
// written against this release's exports), the blank app's catalog, the lockfile. Then template:check. Every
// other version is the workspace's catalog (pnpm-workspace.yaml), once.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('vp run ui:version <version>: the next version without the v, e.g. 0.15.0');
  process.exit(2);
}
const edit = (file: string, change: (manifest: Record<string, any>) => void) => {
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  change(manifest);
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
};
edit('packages/remy-ui/package.json', (m) => (m.version = version));
edit('packages/remy-cli/package.json', (m) => (m.version = version));
for (const file of ['packages/remy-showcase/package.json', 'packages/remy-auth-contract/package.json'])
  edit(file, (m) => (m.peerDependencies['@joeblew999/remy-ui'] = `>=${version}`));
// The blank app's catalog names the two at the release.
writeFileSync(
  'template/pnpm-workspace.yaml',
  readFileSync('template/pnpm-workspace.yaml', 'utf8').replace(
    /^( {2}['"]@joeblew999\/remy-(?:ui|cli)['"]: )['"][^'"]*['"]$/gm,
    `$1'${version}'`,
  ),
);
execFileSync('vp', ['install', '--lockfile-only'], { stdio: ['ignore', 'ignore', 'inherit'] });
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
