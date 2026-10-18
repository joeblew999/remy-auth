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
          env: ['WORKERS_CI_COMMIT_SHA'],
          untrackedEnv: network,
        },
      },
      // The docs' browser checks on the production build (remy-ui's docs checks, Playwright run directly, the built
      // Worker on Cloudflare's local runtime at DOCS_PREVIEW_PORT, 4174). Ask AI's search is Cloudflare's only, so
      // answers take their "no answer" path here.
      browsers: { command: 'vp exec playwright install chromium', cache: false },
      'test:browser': {
        command: `CI=\${CI:-1} PREVIEW_PORT=\${DOCS_PREVIEW_PORT:-4174} playwright test -c node_modules/@joeblew999/remy-ui/src/docs/playwright.config.js --project=ours`,
        dependsOn: ['build', 'browsers'],
        cache: {
          // Named, not traced: Wrangler writes a scratch folder beside the configuration it serves (dist/server/.wrangler)
          // on every run, which a traced input would count. What the checks test is the build, and the checks come with
          // the platform's version (the lockfile).
          input: ['dist/**', '!dist/**/.wrangler/**', '../pnpm-lock.yaml'],
          output: [],
          untrackedEnv: ['DOCS_PREVIEW_PORT', ...network],
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
