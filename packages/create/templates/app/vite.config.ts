import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { network, style } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';

// This app: the shared Vite configuration (@joeblew999/remy-ui/app/vite), the shared style, and every task, all of them
// here. The flow (vp run ci, translate, setup) is package.json's scripts; the docs' tasks are
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
// What the build itself writes (TanStack's route tree, Wrangler's types, Paraglide's output): not its input, or Vite
// Plus would refuse to cache a task that changes what it reads. The lockfile stands for node_modules, which is skipped.
const written = [
  '!**/paraglide/**',
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
  // The shared style, each part by name (vp create and vp migrate read the keys written here).
  fmt: style.fmt,
  lint: style.lint,
  staged: style.staged,
  test: style.test,
  ...remyApp({ root: import.meta.dirname }),
  // This folder is the app and the workspace's root too: bare vp dev, vp build and vp preview act on it (monorepo.md).
  defaultPackage: '.',
  run: {
    tasks: {
      // What the type check needs and git does not hold: the app's compiled strings (Paraglide's compiler, with the
      // options of remy-ui's app-catalog.ts, which the app's Vite plugin uses) and the Worker's binding types.
      generate: {
        command: [
          'paraglide-js compile --project ./project.inlang --outdir ./src/paraglide --strategy baseLocale --emit-ts-declarations --no-emit-git-ignore',
          'wrangler types',
        ],
        dependsOn: ['docs#generate'],
        cache: { input: [{ auto: true }, ...written, lockfile], untrackedEnv: network },
      },
      // The build's folder emptied first: a cache hit restores the build's files over what is there and removes
      // nothing, so an earlier build's chunks would stay beside them.
      clean: { command: `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"`, cache: false },
      dev: { command: 'vp dev', dependsOn: ['generate'], cache: false },
      // The production build, replayed while nothing it reads changes. Its stamp names a commit only when one is
      // given (Workers Builds' WORKERS_CI_COMMIT_SHA), and those are in the cache key.
      build: {
        command: 'vp build',
        dependsOn: ['generate', 'clean'],
        cache: {
          input: [{ auto: true }, ...written, lockfile],
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
      browsers: { command: 'vp exec playwright install chromium', cache: false },
      // The browser checks on the production build, one language per way of drawing text, Playwright's own options passed through (`vp run test:browser --shard 1/3`). CI=1 unless set: the same
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
      // Google's Lighthouse audits on the production build, one at a time (two at once skew both).
      'test:audits': {
        command: 'CI=${CI:-1} PREVIEW_PORT=${PREVIEW_PORT:-4173} playwright test --project=google --workers=1',
        dependsOn: ['build', 'browsers'],
        cache: { untrackedEnv: ['PREVIEW_PORT', ...network], input: browserInputs, output: [] },
      },
      // The project's own checks (remy-check). A check never writes: `vp run fix` writes what two of them report.
      'check:wrangler': 'remy-check wrangler',
      'check:commands': 'remy-check commands',
      'check:endings': 'remy-check endings',
      'check:translations': 'remy-check translations',
      // The plain-function checks (tests/**/*.unit.spec.ts) on Vite Plus's test runner: no Worker, no browser.
      'check:unit': {
        command: 'vp test',
        dependsOn: ['check:commands', 'generate'],
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
          'docs#check:deploy',
          'check:wrangler',
          'check:commands',
          'check:endings',
          'check:translations',
          'check:unit',
        ],
      },
      // What the checks only verify, written: the commands list (COMMANDS.md) and each docs page's ending.
      fix: { command: ['remy-check commands --write', 'remy-check endings --write'], cache: false },
    },
  },
});
