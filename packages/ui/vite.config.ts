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
      cli: { command: 'tsc -p src/cli', cache: { input: [{ auto: true }, '!cli/**'] } },
    },
  },
};
