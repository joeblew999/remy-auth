#!/usr/bin/env node
// remy-check: the project's own checks, one per Vite Plus task (`check:plans`, `check:commands`…), each a plain tool:
// it reads, says what is wrong, and exits non-zero, and nothing else happens around it (no timing record, no
// configuration loaded, unlike `remy`). A check never writes: `--write` fixes what it would report (the commands list,
// the docs pages' endings), which is what `vp run fix` runs. remy-auth runs this source; an app the package's bin.
import { writeCommands } from './help.ts';
import { checkAll as translations } from './i18n.ts';
import { rightEndings } from './page.ts';
import { check as plans } from './plans.ts';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docsDir } from './config.ts';

/**
 * The packages that break when installed twice (React's hooks, TanStack's router and query types, the
 * MDX stringifier Fumadocs builds with) have one version in this install. The list is the package's
 * own (@joeblew999/remy-ui's package.json, "remy.singleCopy"); npm's hoisting decides the rest.
 */
export function singleCopies(): void {
  const { remy } = JSON.parse(
    readFileSync(join(process.cwd(), 'node_modules/@joeblew999/remy-ui/package.json'), 'utf8'),
  ) as { remy?: { singleCopy?: string[] } };
  const problems: string[] = [];
  for (const name of remy?.singleCopy ?? []) {
    const found = JSON.parse(
      execFileSync('npm', ['query', `#${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
    ) as { version: string; location: string }[];
    const versions = [...new Set(found.map((item) => item.version))];
    if (versions.length > 1)
      problems.push(`${name}: ${versions.join(', ')} (${found.map((item) => item.location).join(', ')})`);
  }
  if (problems.length) {
    console.error(
      `single copies: installed more than once, which breaks at run or type-check time:\n  ${problems.join('\n  ')}\nThe versions come from @joeblew999/remy-ui; remove this app's own pins of them, then npm install.`,
    );
    process.exit(1);
  }
  console.log(`single copies: one version each of ${remy?.singleCopy?.length ?? 0} packages.`);
}

const checks: Record<string, (write: boolean) => void | Promise<unknown>> = {
  // .plans/: few, short, closed, every link resolving and every open plan in now.md.
  plans: () => plans(),
  // The packages that break when installed twice have one version each in this install.
  'single-copies': () => singleCopies(),
  // COMMANDS.md (here, and the blank app's in remy-auth) is what the command line and the tasks say.
  commands: async (write) => {
    await writeCommands(!write);
  },
  // Each docs page's ending: .mdx when it uses a component, .md otherwise (here and the blank app's).
  endings: (write) => {
    const lines = rightEndings([join(docsDir() ?? 'docs', 'content'), 'template/docs/content'], !write);
    for (const line of lines) console.log(`endings: ${line}`);
    if (!write && lines.length) {
      console.error('endings: vp run fix renames them.');
      process.exit(1);
    }
  },
  // The translations, offline: a warning while they are owed (vp run translate writes them, in the change).
  translations: () => translations(false),
};

const [name = '', ...rest] = process.argv.slice(2);
const check = checks[name];
if (!check) {
  console.error(`remy-check <${Object.keys(checks).join('|')}> [--write]`);
  process.exit(2);
}
await check(rest.includes('--write'));
