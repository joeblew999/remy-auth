#!/usr/bin/env node
// remy-check: the project's own checks, one per Vite Plus task (`check:plans`, `check:commands`…), each a plain tool:
// it reads, says what is wrong, and exits non-zero, and nothing else happens around it (no timing record, no
// configuration loaded, unlike `remy`). A check never writes: `--write` fixes what it would report (the commands list,
// the docs pages' endings), which is what `vp run fix` runs. remy-auth runs this source; an app the package's bin.
import { writeCommands } from './help.ts';
import { checkAll as translations } from './i18n.ts';
import { rightEndings } from './page.ts';
import { check as plans } from './plans.ts';
import { singleCopies } from './check.ts';

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
    const lines = rightEndings(['docs/content', 'template/docs/content'], !write);
    for (const line of lines) console.log(`endings: ${line}`);
    if (!write && lines.length) {
      console.error('endings: vp run fix renames them.');
      process.exit(1);
    }
  },
  // The translations, offline: a warning while they are owed (vp run land translates them in the change).
  translations: () => translations(false),
};

const [name = '', ...rest] = process.argv.slice(2);
const check = checks[name];
if (!check) {
  console.error(`remy-check <${Object.keys(checks).join('|')}> [--write]`);
  process.exit(2);
}
await check(rest.includes('--write'));
