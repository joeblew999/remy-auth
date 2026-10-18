import { network } from './src/vite-plus.js';
import { defineConfig } from 'vite-plus';

// The shared package's own task: its catalogs compiled (src/paraglide, generated), which the app's and the docs'
// generate tasks need first. What it writes is its output, never its input.
export default defineConfig({
  run: {
    tasks: {
      generate: {
        command: 'node paraglide.mjs',
        cache: { input: [{ auto: true }, '!src/paraglide/**'], untrackedEnv: network },
      },
    },
  },
});
