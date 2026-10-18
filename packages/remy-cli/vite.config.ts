import { defineConfig } from 'vite-plus';

// The command line as an installed app runs it: dist/, JavaScript and declarations, which the package ships (Node
// strips types from nothing under node_modules; remy-auth runs the source).
export default defineConfig({
  run: {
    tasks: {
      // dist/ emptied first, every time: a cache hit restores the build's files over what is there and removes
      // nothing, so a command whose source is gone would stay behind and ship.
      clean: { command: `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"`, cache: false },
      build: {
        command: 'tsc -p .',
        dependsOn: ['clean'],
        cache: { input: [{ auto: true }, '!dist/**'], output: ['dist/**'] },
      },
    },
  },
});
