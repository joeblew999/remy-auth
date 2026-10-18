import { remyDocs } from '@joeblew999/remy-ui/docs/vite';
import { network } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';
import { docsConfig } from './docs.config.ts';

// This app's docs Worker: @joeblew999/remy-ui's, over content/ and docs.config.ts, documenting this app's API with
// the app's own words (../remy-auth's catalog), and its tasks, all of them here. Its generated files (.remy-docs/) are
// written when this configuration is loaded, which every vp command does.
export default defineConfig({
  ...remyDocs(docsConfig, {
    contract: '@joeblew999/remy-auth-contract',
    root: import.meta.dirname,
    app: `${import.meta.dirname}/../remy-auth`,
  }),
  run: {
    tasks: {
      // The Worker's binding types, after the shared catalogs the pages' words come from.
      generate: {
        command: 'wrangler types -c .remy-docs/wrangler.json',
        dependsOn: ['@joeblew999/remy-ui#generate'],
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
          input: [{ auto: true }, '!.remy-docs/**', '!dist/**', '!.wrangler/**'],
          output: ['dist/**'],
          env: ['REMY_COMMIT', 'REMY_CHANGES', 'WORKERS_CI_COMMIT_SHA'],
          untrackedEnv: network,
        },
      },
    },
  },
});
