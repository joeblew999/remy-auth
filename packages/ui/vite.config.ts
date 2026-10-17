import { network } from './src/tasks.js';

// The shared package's own tasks (Vite Plus runs them first for whatever depends on the package): its catalogs
// compiled (src/paraglide, generated), and its command line as an installed app runs it (cli/, JavaScript and
// declarations, which the package ships). What each writes is its output, never its input.
export default {
  run: {
    tasks: {
      generate: {
        command: 'node paraglide.mjs',
        cache: { input: [{ auto: true }, '!src/paraglide/**'], untrackedEnv: network },
      },
      // cli/ emptied, then compiled, in one process: a command whose source is gone leaves nothing behind (ci.js stayed
      // and would have shipped, 2026-10-17). Only when the sources changed: as a task of its own, run every time, the
      // emptying raced the tasks reading cli/ and made them miss ("'cli' removed from 'packages/ui'"). One process, not
      // `&&`: Vite Plus caches each side of an `&&` apart, so a cached emptying would not run before a new compile.
      cli: {
        command: `node -e "require('node:fs').rmSync('cli', { recursive: true, force: true }); require('node:child_process').execFileSync('tsc', ['-p', 'src/cli'], { stdio: 'inherit' })"`,
        cache: { input: [{ auto: true }, '!cli/**'] },
      },
    },
  },
};
