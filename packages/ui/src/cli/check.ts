// The check (STEP 1, `remy change`): what runs after every change, in seconds, and nothing that needs a
// browser. Each part is a function here as its slice lands (.plans/tooling-in-typescript.md); the
// parts still in mise are flow.ts's steps.change.tasks, run after these. `remy check <part>` runs one
// part, for the mise tasks that forward to it until they go.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { run, steps } from './flow.ts';
import { checkAll as translations } from './i18n.ts';
import { check as plans } from './plans.ts';

/**
 * The packages that break when installed twice (React's hooks, TanStack's router and query types, the
 * MDX stringifier Fumadocs builds with) have one version in this install. The list is the package's
 * own (@joeblew999/remy-ui's package.json, "remy.singleCopy"); npm's hoisting decides the rest.
 */
export function singleCopies(): void {
  const { remy } = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/@joeblew999/remy-ui/package.json'), 'utf8')) as { remy?: { singleCopy?: string[] } };
  const problems: string[] = [];
  for (const name of remy?.singleCopy ?? []) {
    const found = JSON.parse(execFileSync('npm', ['query', `#${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) as { version: string; location: string }[];
    const versions = [...new Set(found.map(item => item.version))];
    if (versions.length > 1) problems.push(`${name}: ${versions.join(', ')} (${found.map(item => item.location).join(', ')})`);
  }
  if (problems.length) {
    console.error(`single copies: installed more than once, which breaks at run or type-check time:\n  ${problems.join('\n  ')}\nThe versions come from @joeblew999/remy-ui; remove this app's own pins of them, then npm install.`);
    process.exit(1);
  }
  console.log(`single copies: one version each of ${remy?.singleCopy?.length ?? 0} packages.`);
}

/** The parts in TypeScript, in order; the rest follow from steps.change.tasks. Translations are a warning here. */
export const parts: Record<string, () => void | Promise<unknown>> = {
  plans,
  'single-copies': singleCopies,
  translations: () => translations(false),
};

/** The whole check: the parts here, then what is still a mise task. */
export async function check(): Promise<void> {
  for (const part of Object.values(parts)) await part();
  for (const task of steps.change.tasks) run(task, 'change');
}

export async function main(args: string[]): Promise<void> {
  const [name] = args;
  if (!name) { await check(); return; }
  const part = parts[name];
  if (!part) { console.error(`remy check: no part "${name}"; one of ${Object.keys(parts).join(', ')}, or none for the whole check.`); process.exit(2); }
  await part();
}
