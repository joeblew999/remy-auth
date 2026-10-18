import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { network } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';
import { options as paraglide } from '../../packages/remy-ui/paraglide.mjs';

// remy-auth's app: the shared Vite configuration (@joeblew999/remy-ui/app/vite) with the Paraglide compiler for the
// shared catalogs, which this repository owns (packages/remy-ui/messages), and the app's own tasks, all of them here.
// Its folder is this file's, never the folder a tool happened to start in (Vite Plus loads every package's config
// from the root).

// What a browser run reads that is not what it tests: its own results, Wrangler's local state, tools' caches.
const browserInputs = [
  { auto: true },
  '!**/test-results/**',
  '!**/playwright-report/**',
  '!**/.wrangler/**',
  '!**/node_modules/.*/**',
];

// What the build and the generators write, never read as their input.
const written = [
  '!**/routeTree.gen.ts',
  '!**/worker-configuration.d.ts',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/test-results/**',
  '!**/playwright-report/**',
  '!**/.wrangler/**',
];

// The installed dependencies, which no task reads as files: their lockfile, so a dependency update builds again.
const lockfile = { pattern: 'pnpm-lock.yaml', base: 'workspace' } as const;

export default defineConfig({
  ...remyApp({ plugins: [paraglideVitePlugin(paraglide)], root: import.meta.dirname }),
  run: {
    tasks: {
      // The app's local state: .dev.vars, the migrations on Wrangler's local databases. Every time: it applies only
      // what is missing.
      local: { command: 'node scripts/local.ts', cache: false },
      // What the type check needs and git does not hold: the Worker's binding types, after the shared catalogs.
      generate: {
        command: 'wrangler types',
        dependsOn: ['@joeblew999/remy-ui#generate'],
        cache: { input: [{ auto: true }, ...written, lockfile], untrackedEnv: network },
      },
      // The build's folder emptied first: a cache hit restores the build's files over what is there and removes
      // nothing, so an earlier build's chunks would stay beside them.
      clean: { command: `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"`, cache: false },
      dev: { command: 'vp dev', dependsOn: ['local', 'generate'], cache: false },
      // The production build, replayed while nothing it reads changes, across commits too. Its stamp names a commit
      // only when one is given (Workers Builds' WORKERS_CI_COMMIT_SHA), and those are in the
      // cache key, so a deployment never takes another commit's build.
      build: {
        command: 'vp build',
        dependsOn: ['local', 'generate', 'clean'],
        cache: {
          input: [{ auto: true }, ...written, lockfile],
          output: ['dist/**'],
          env: ['WORKERS_CI_COMMIT_SHA'],
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
      // The production build on Cloudflare's local host.
      preview: {
        command: 'wrangler dev --ip 127.0.0.1 --port ${PREVIEW_PORT:-4173}',
        dependsOn: ['build'],
        cache: false,
      },
      // What a browser check needs on this machine: Playwright's Chromium (on Linux the Han languages also need a Han
      // font, fonts-noto-cjk, which GitHub's workflow installs).
      browsers: { command: 'playwright install chromium', cache: false },
      // The browser checks on the production build, one language per way of drawing text, Playwright's own options passed through (`vp run remy-auth#test:browser --shard 1/3`). CI=1 unless set:
      // the same Playwright here as on GitHub, a browser per core.
      'test:browser': {
        command: 'CI=${CI:-1} PREVIEW_PORT=${PREVIEW_PORT:-4173} playwright test --project=ours',
        dependsOn: ['build', 'browsers'],
        cache: {
          env: ['CHECK_LOCALES', 'COLOR_SCHEME'],
          untrackedEnv: ['PREVIEW_PORT', ...network],
          input: browserInputs,
          output: [],
        },
      },
      // Google's Lighthouse audits on the production build, one at a time (two at once skew both).
      'test:audits': {
        command: 'CI=${CI:-1} PREVIEW_PORT=${PREVIEW_PORT:-4173} playwright test --project=google --workers=1',
        dependsOn: ['build', 'browsers'],
        cache: { untrackedEnv: ['PREVIEW_PORT', ...network], input: browserInputs, output: [] },
      },
    },
  },
});
