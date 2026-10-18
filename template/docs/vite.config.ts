import { remyDocs } from '@joeblew999/remy-ui/docs/vite';
import { network } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';
import { docsConfig } from './docs.config.ts';

// This app's docs Worker: @joeblew999/remy-ui's, over content/ and docs.config.ts, and its tasks, all of them here.
// With an API, docs.config.ts names its contract's package (contract: '@you/my-app-contract') so /reference documents it.
export default defineConfig({
  ...remyDocs(docsConfig, { root: import.meta.dirname }),
  run: {
    tasks: {
      // The Worker's binding types.
      generate: {
        command: 'wrangler types',
        cache: { input: [{ auto: true }, '!worker-configuration.d.ts'] },
      },
      // The build's folder emptied first: a cache hit restores the build over what is there and removes nothing.
      clean: { command: `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"`, cache: false },
      dev: { command: 'vp dev', dependsOn: ['generate'], cache: false },
      // The production build, which proves every page compiles, translations included.
      build: {
        command: 'vp build',
        dependsOn: ['generate', 'clean'],
        cache: {
          input: [{ auto: true }, '!dist/**', '!.wrangler/**'],
          output: ['dist/**'],
          env: ['REMY_COMMIT', 'REMY_CHANGES', 'WORKERS_CI_COMMIT_SHA'],
          untrackedEnv: network,
        },
      },
      // Wrangler's deployment dry run on the build (no upload): the Worker as Cloudflare would take it.
      'check:deploy': {
        command: 'wrangler deploy --dry-run',
        dependsOn: ['build'],
        cache: {
          input: [{ auto: true }, '!**/node_modules/**', '!**/.wrangler/**'],
          output: [],
          untrackedEnv: network,
        },
      },
    },
  },
});
