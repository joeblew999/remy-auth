// The blank app's pins after `changeset version` (vp run release runs it next): the platform's two packages in the
// blank app's catalog and its shared workflow's tag, at remy-ui's new version, then the lockfile. Changesets versions
// the workspace's packages; the blank app is not one of them.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('packages/remy-ui/package.json', 'utf8')) as { version: string };
const edit = (file: string, change: (text: string) => string) =>
  writeFileSync(file, change(readFileSync(file, 'utf8')));
edit('packages/create/templates/app/pnpm-workspace.yaml', (text) =>
  text.replace(/^( {2}['"]@joeblew999\/remy-(?:ui|cli)['"]: )['"][^'"]*['"]$/gm, `$1'${version}'`),
);
edit('packages/create/templates/app/.github/workflows/ci.yml', (text) =>
  text.replace(/workflows\/(?:google|ci)\.yml@v\d+\.\d+\.\d+/g, `workflows/ci.yml@v${version}`),
);
execFileSync('vp', ['install', '--lockfile-only'], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`The blank app (packages/create/templates/app) pins ${version}.`);
