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
      // cli/ emptied first, every time: a cache hit restores the outputs over the folder and deletes nothing, so a
      // command whose source is gone would otherwise stay in cli/ and ship (ci.js, 2026-10-17).
      'clean:cli': {
        command: "node -e \"require('node:fs').rmSync('cli', { recursive: true, force: true })\"",
        cache: false,
      },
      cli: { command: 'tsc -p src/cli', dependsOn: ['clean:cli'], cache: { input: [{ auto: true }, '!cli/**'] } },
    },
  },
};
