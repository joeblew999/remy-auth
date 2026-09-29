// The packages this repository publishes: its npm workspaces that are not private, with the registry each
// publishes to (publishConfig). The packages:* tasks read this list, so a repository that owns packages
// declares them once, in package.json's workspaces (.plans/thin-apps.md, group 6).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const workspaces = manifest.workspaces?.length
  ? JSON.parse(execFileSync('npm', ['query', '.workspace'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }))
  : [];
const published = workspaces.filter(item => !item.private).map(item => ({
  name: item.name,
  version: item.version,
  location: item.location,
  registry: item.publishConfig?.registry ?? 'https://registry.npmjs.org',
}));
const [mode] = process.argv.slice(2);
// --names: every workspace's name (private ones too), comma-separated, for npm-check-updates' --reject.
if (mode === '--names') console.log(workspaces.map(item => item.name).join(','));
// --has-workspaces: exit 0 when package.json declares workspaces.
else if (mode === '--has-workspaces') process.exit(workspaces.length ? 0 : 1);
else for (const item of published) console.log([item.name, item.version, item.registry, item.location].join('\t'));
