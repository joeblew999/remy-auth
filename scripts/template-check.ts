// npm run template:check: the blank app (template/) pins this release of @joeblew999/remy-ui: its
// package.json and its CI workflow's tag. A release check.
import { readFileSync } from 'node:fs';

const version = (JSON.parse(readFileSync('packages/ui/package.json', 'utf8')) as { version: string }).version;
const problems: string[] = [];
const pkg = JSON.parse(readFileSync('template/package.json', 'utf8')) as { dependencies?: Record<string, string> };
if (pkg.dependencies?.['@joeblew999/remy-ui'] !== version) problems.push(`template/package.json: @joeblew999/remy-ui must be "${version}"`);
if (!readFileSync('template/.github/workflows/google.yml', 'utf8').includes(`google.yml@v${version}\n`)) problems.push(`template/.github/workflows/google.yml: google.yml@v${version}`);
if (problems.length) { console.error(`template/ must pin ${version}:\n${problems.map(p => `  ${p}`).join('\n')}`); process.exit(1); }
console.log(`template/ pins ${version}.`);
