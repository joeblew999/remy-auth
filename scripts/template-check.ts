// npm run template:check: the blank app (template/) pins this release of @joeblew999/remy-ui: its
// package.json, its CI workflow's tag, and its mise include while it has one. A release check.
import { existsSync, readFileSync } from 'node:fs';

const version = (JSON.parse(readFileSync('packages/ui/package.json', 'utf8')) as { version: string }).version;
const problems: string[] = [];
const pkg = JSON.parse(readFileSync('template/package.json', 'utf8')) as { dependencies?: Record<string, string> };
if (pkg.dependencies?.['@joeblew999/remy-ui'] !== version) problems.push(`template/package.json: @joeblew999/remy-ui must be "${version}"`);
if (!readFileSync('template/.github/workflows/google.yml', 'utf8').includes(`google.yml@v${version}\n`)) problems.push(`template/.github/workflows/google.yml: google.yml@v${version}`);
if (existsSync('template/mise.toml') && !readFileSync('template/mise.toml', 'utf8').includes(`tasks?ref=v${version}"`)) problems.push(`template/mise.toml: ref=v${version}`);
if (problems.length) { console.error(`template/ must pin ${version}:\n${problems.map(p => `  ${p}`).join('\n')}`); process.exit(1); }
console.log(`template/ pins ${version}.`);
