import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { network, style } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';

// This app: the shared Vite configuration (@joeblew999/remy-ui/app/vite), the shared style, and every task, all of them
// here. The flow (vp run ci, land, promote, release, setup) is package.json's scripts; the docs' tasks are
// docs/vite.config.ts's.

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
  '!**/paraglide/**',
  '!**/routeTree.gen.ts',
  '!**/worker-configuration.d.ts',
  '!**/node_modules/**',
  '!**/.remy-docs/**',
  '!**/dist/**',
  '!**/test-results/**',
  '!**/playwright-report/**',
  '!**/.wrangler/**',
];

// The installed dependencies, which no task reads as files: their lockfile, so a dependency update builds again.
const lockfile = { pattern: 'package-lock.json', base: 'workspace' } as const;

export default defineConfig({
  ...style,
  ...remyApp({ root: import.meta.dirname }),
  run: {
    tasks: {
      // What the type check needs and git does not hold: the app's compiled strings and the Worker's binding types.
      generate: {
        command: ['node node_modules/@joeblew999/remy-ui/src/app-catalog.js', 'wrangler types'],
        dependsOn: ['docs#generate'],
        cache: { input: [{ auto: true }, ...written, lockfile], untrackedEnv: network },
      },
      // The build's folder emptied first: a cache hit restores the build's files over what is there and removes
      // nothing, so an earlier build's chunks would stay beside them.
      clean: { command: `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"`, cache: false },
      dev: { command: 'vp dev', dependsOn: ['generate'], cache: false },
      // The production build, replayed while nothing it reads changes. Its stamp names a commit only when one is
      // given (a deploy's REMY_COMMIT, Workers Builds' WORKERS_CI_COMMIT_SHA), and those are in the cache key.
      build: {
        command: 'vp build',
        dependsOn: ['generate', 'clean'],
        cache: {
          input: [{ auto: true }, ...written, lockfile],
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
      // The production build on Cloudflare's local host.
      preview: {
        command: 'wrangler dev --ip 127.0.0.1 --port ${PREVIEW_PORT:-4173}',
        dependsOn: ['build'],
        cache: false,
      },
      // What a browser check needs on this machine: Playwright's Chromium and, on Linux, a Han font.
      browsers: { command: 'remy browsers', cache: false },
      // The browser checks on the production build, one language per way of drawing text (CHECK_LOCALES=all: every
      // one), Playwright's own options passed through (`vp run test:browser --shard 1/3`). CI=1 unless set: the same
      // Playwright here as on GitHub, a browser per core.
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
      // Google's Lighthouse audits on the production build, under the machine's speed lock.
      'test:audits': {
        command: 'CI=${CI:-1} PREVIEW_PORT=${PREVIEW_PORT:-4173} remy test audits',
        dependsOn: ['build', 'browsers'],
        cache: { untrackedEnv: ['PREVIEW_PORT', ...network], input: browserInputs, output: [] },
      },
      // The project's own checks (remy-check). A check never writes: `vp run fix` writes what two of them report.
      'check:plans': 'remy-check plans',
      'check:single-copies': 'remy-check single-copies',
      'check:commands': 'remy-check commands',
      'check:endings': 'remy-check endings',
      'check:translations': 'remy-check translations',
      // The plain-function checks (tests/**/*.unit.spec.ts) on Vite Plus's test runner: no Worker, no browser.
      'check:unit': {
        command: 'vp test',
        dependsOn: ['check:commands', 'generate'],
        cache: {
          input: [{ auto: true }, '!**/node_modules/.*/**'],
          output: [{ auto: true }, '!**/node_modules/.*/**'],
        },
      },
      // Every check, after every change: Vite Plus's own (format, lint, types) once everything it reads exists (the
      // app and its docs built), Wrangler's deployment dry run, the project's own checks and the unit checks.
      ready: {
        command: 'vp check',
        dependsOn: [
          'generate',
          'build',
          'check:deploy',
          'docs#build',
          'check:plans',
          'check:single-copies',
          'check:commands',
          'check:endings',
          'check:translations',
          'check:unit',
        ],
      },
      // What the checks only verify, written: the commands list (COMMANDS.md) and each docs page's ending.
      fix: { command: ['remy-check commands --write', 'remy-check endings --write'], cache: false },
      // Each package this repository publishes, if any (GitHub's release job, for a version tag), and the same
      // rehearsed (vp run release): every registry takes its token, nothing is uploaded.
      publish: { command: 'remy packages publish', dependsOn: ['generate'], cache: false },
      'publish:rehearse': { command: 'remy packages publish --dry-run', dependsOn: ['generate'], cache: false },
    },
  },
});
