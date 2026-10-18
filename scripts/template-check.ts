// vp run template:check: the blank app (template/) pins this release of @joeblew999/remy-ui and its command line:
// its catalog (pnpm-workspace.yaml) and its CI workflow's tag. A release check.
import { readFileSync } from 'node:fs';

const version = (JSON.parse(readFileSync('packages/remy-ui/package.json', 'utf8')) as { version: string }).version;
const problems: string[] = [];
const catalog = readFileSync('template/pnpm-workspace.yaml', 'utf8');
for (const name of ['@joeblew999/remy-ui', '@joeblew999/remy-cli'])
  if (!new RegExp(`^ {2}['"]${name}['"]: ['"]${version}['"]$`, 'm').test(catalog))
    problems.push(`template/pnpm-workspace.yaml: ${name} must be "${version}"`);
// The shared workflow is ci.yml from the release after 0.15.1; 0.15.1 itself has only google.yml.
const shared = version === '0.15.1' ? 'google.yml' : 'ci.yml';
if (!readFileSync('template/.github/workflows/ci.yml', 'utf8').includes(`${shared}@v${version}\n`))
  problems.push(`template/.github/workflows/ci.yml: ${shared}@v${version}`);
if (problems.length) {
  console.error(`template/ must pin ${version}:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`template/ pins ${version}.`);
