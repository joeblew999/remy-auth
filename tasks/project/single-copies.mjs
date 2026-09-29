// project:single-copies: the packages that break when installed twice (React's hooks, TanStack's router and
// query types, the MDX stringifier Fumadocs builds with) have one version in this install. The list is the
// package's own (@joeblew999/remy-ui's package.json, "remy.singleCopy"); npm's hoisting decides the rest.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { remy } = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@joeblew999/remy-ui/package.json'), 'utf8'));
const problems = [];
for (const name of remy?.singleCopy ?? []) {
  const found = JSON.parse(execFileSync('npm', ['query', `#${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const versions = [...new Set(found.map(item => item.version))];
  if (versions.length > 1) problems.push(`${name}: ${versions.join(', ')} (${found.map(item => item.location).join(', ')})`);
}
if (problems.length) {
  console.error(`project:single-copies: installed more than once, which breaks at run or type-check time:\n  ${problems.join('\n  ')}\nThe versions come from @joeblew999/remy-ui; remove this app's own pins of them, then npm install.`);
  process.exit(1);
}
console.log(`project:single-copies: one version each of ${remy?.singleCopy?.length ?? 0} packages.`);
