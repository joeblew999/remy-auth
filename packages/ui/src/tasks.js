// The tasks every Remy app runs through Vite Plus (`vp run <task>`), defined once, here: remyApp() puts them in the
// app's vite.config.ts, so an app's whole configuration stays `export default remyApp()` and remy-auth adds only
// its own. Vite Plus decides what runs, in what order and what it can skip (its cache); each task runs one tool,
// visibly (.plans/2026-10-17-02-vite-plus.md). What differs between apps is read from the app's folder, never set:
// remy-auth runs the command line's source, an app the installed `remy`; an app with project.inlang compiles its
// own strings; one with scripts/local.ts prepares its local state; one with docs/ checks its docs Worker too.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** What a task writes and never reads as an input: generated files, builds, test results, local state. */
export const generated = [
  '!**/paraglide/**',
  '!packages/ui/cli/**',
  '!src/routeTree.gen.ts',
  '!worker-configuration.d.ts',
  '!node_modules/**',
  '!.remy-docs/**',
  '!docs/.remy-docs/**',
  '!dist/**',
  '!docs/dist/**',
  '!test-results/**',
  '!playwright-report/**',
  '!**/.wrangler/**',
];

/** What a browser run reads that is not what it tests: its own results, Wrangler's local state, tools' caches. */
const browserInputs = [
  { auto: true },
  '!test-results/**',
  '!playwright-report/**',
  '!**/.wrangler/**',
  '!node_modules/.*/**',
];

/**
 * The machine's way to the network (its proxy and the certificates the proxy needs): what a cached task that may
 * download needs to see, without it counting in what is cached. A cached task sees only the variables it names, and
 * without these the catalogs' compiler cannot fetch its message-format plugin behind a proxy and compiles no messages,
 * silently (a new app in a cloud container, 2026-10-17). An uncached task sees the whole environment already.
 */
export const network = [
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'NO_PROXY',
  'no_proxy',
  'NODE_EXTRA_CA_CERTS',
  'SSL_CERT_FILE',
  'REQUESTS_CA_BUNDLE',
];

/** GitHub's jobs, one `vp run <task>` each, in parallel (the workflow is held to this list by a unit check). */
export const githubJobs = (shards = 3) => [
  'check',
  ...Array.from({ length: shards }, (_, i) => `test:browser --shard ${i + 1}/${shards}`),
  'test:audits',
];

/** The app's tasks, from its folder; `tasks` adds the app's own or replaces a shared one by name. */
export function remyTasks({ root = process.cwd(), tasks = {} } = {}) {
  const has = (path) => existsSync(resolve(root, path));
  // remy-auth, the package's own repository, runs the command line's TypeScript source; an app, the installed bin.
  const own = has('packages/ui/src/cli/remy.ts');
  const remy = own ? 'node packages/ui/src/cli/remy.ts' : 'remy';
  const check = own ? 'node packages/ui/src/cli/checks.ts' : 'remy-check';
  const docs = has('docs/package.json')
    ? JSON.parse(readFileSync(resolve(root, 'docs/package.json'), 'utf8')).name
    : undefined;
  // The strings the type check needs compiled: remy-auth's shared catalogs, or the app's own when it has them.
  const catalog = own
    ? ['node packages/ui/paraglide.mjs']
    : has('project.inlang')
      ? ['node node_modules/@joeblew999/remy-ui/src/app-catalog.js']
      : [];
  const local = has('scripts/local.ts');
  const prepared = [...(local ? ['local'] : []), 'generate'];
  return {
    // The app's local state: .dev.vars, the migrations on Wrangler's local databases, whatever else the app's
    // scripts/local.ts sets up. Every time: it applies only what is missing.
    ...(local ? { local: { command: 'node scripts/local.ts', cache: false } } : {}),
    // What the type check needs and git does not hold: the compiled strings and the Worker's binding types, after
    // the docs' own. Each step reads the file it is about to rewrite: what it writes is its output, never its input.
    generate: {
      command: [...catalog, 'wrangler types'],
      dependsOn: docs ? [`${docs}#generate`] : [],
      cache: { input: [{ auto: true }, '!**/paraglide/**', '!worker-configuration.d.ts'], untrackedEnv: network },
    },
    // vp dev, vp build and vp preview are Vite Plus's own; these are the app's, with what they need first.
    dev: { command: 'vp dev .', dependsOn: prepared, cache: false },
    // The production build, then Wrangler's deployment dry run (no upload). Its stamp names the commit it was built
    // from (build-vite.js, through git, which Vite Plus does not see): git's record of the current commit is an input
    // too, so a new commit builds again.
    build: {
      command: ['vp build .', 'wrangler deploy --dry-run'],
      dependsOn: prepared,
      cache: {
        input: [{ auto: true }, ...generated, '.git/HEAD', '.git/refs/heads/**', '.git/packed-refs'],
        output: ['dist/**'],
        untrackedEnv: network,
      },
    },
    // The production build on Cloudflare's local host, at PREVIEW_PORT (4173 unless a worktree has its own).
    preview: {
      command: 'wrangler dev --ip 127.0.0.1 --port ${PREVIEW_PORT:-4173}',
      dependsOn: ['build'],
      cache: false,
    },
    // The project's own checks (remy-check, the package's plain tool for them). A check never writes: `vp run fix`
    // writes what the two that could fix something report.
    'check:plans': `${check} plans`,
    'check:single-copies': `${check} single-copies`,
    'check:commands': `${check} commands`,
    'check:endings': `${check} endings`,
    'check:translations': `${check} translations`,
    // The checks that are plain functions (tests/**/*.unit.spec.ts), on Vite Plus's test runner: no Worker, no browser.
    // Vitest's own caches (node_modules/.vite, .vitest-cache: hidden folders) are neither input nor output.
    'check:unit': {
      command: 'vp test',
      dependsOn: ['check:commands', 'generate'],
      cache: { input: [{ auto: true }, '!node_modules/.*/**'], output: [{ auto: true }, '!node_modules/.*/**'] },
    },
    // The check: Vite Plus's own (format, lint, types) once everything it reads exists, the app and its docs built
    // (the route tree, every docs page compiling, translations included), and the project's own checks passed.
    check: {
      command: 'vp check',
      dependsOn: [
        'generate',
        'build',
        ...(docs ? [`${docs}#build`] : []),
        'check:plans',
        'check:single-copies',
        'check:commands',
        'check:endings',
        'check:translations',
        'check:unit',
      ],
    },
    // What a browser check needs on this machine: Playwright's Chromium and, on Linux, a Han font (remy browsers).
    browsers: { command: `${remy} browsers`, cache: false },
    // The browser checks on the production build, every language (CHECK_LOCALES=quick: a few), Playwright's own
    // options passed through (`vp run test:browser --shard 1/3`, `--grep <words>`). The build they test is an
    // input; Playwright's results and Wrangler's local state are neither input nor output.
    'test:browser': {
      command: 'playwright test --project=ours',
      dependsOn: ['build', 'browsers'],
      cache: { env: ['CHECK_LOCALES'], untrackedEnv: ['PREVIEW_PORT', ...network], input: browserInputs, output: [] },
    },
    // Google's Lighthouse audits on the production build. `vp run ci` runs them after the browser checks, never
    // beside them: they measure speed.
    'test:audits': {
      command: 'playwright test --project=google',
      dependsOn: ['build', 'browsers'],
      cache: { untrackedEnv: ['PREVIEW_PORT', ...network], input: browserInputs, output: [] },
    },
    // What the check only verifies, written: the commands list (COMMANDS.md) and each docs page's ending.
    fix: { command: [`${check} commands --write`, `${check} endings --write`], cache: false },
    // What GitHub runs, the same here: the check, then the browser checks, then Google's audits, one after the other
    // (each `vp run` inlined as its own cached task). GitHub runs each part as a job of its own (githubJobs).
    ci: { command: ['vp run test:browser', 'vp run test:audits'], dependsOn: ['check'], cache: false },
    ...tasks,
  };
}

/** The formatter and the linter, one style for every app: single quotes, 120 columns, type-aware lint and types. */
export const style = {
  // Code and config only: Markdown is prose whose layout is its author's, and the translations are fingerprinted
  // from it. Generated files are their generator's.
  fmt: {
    singleQuote: true,
    printWidth: 120,
    ignorePatterns: ['**/*.md', '**/*.mdx', '**/routeTree.gen.ts', '**/worker-configuration.d.ts', '**/paraglide/**'],
  },
  // Vite Plus's type check runs inside its lint (typeAware and typeCheck), so `vp check` is format, lint and types.
  // template/ and fixtures/ are other apps' source in remy-auth, checked as installed apps by the new-app test.
  lint: { options: { typeAware: true, typeCheck: true }, ignorePatterns: ['template/**', 'fixtures/**'] },
  // vp staged (the pre-commit hook, .vite-hooks/pre-commit): the staged files formatted and their lint fixes applied.
  staged: { '*': 'vp check --fix' },
  // vp test: the plain-function checks only; tests/*.spec.ts are the browser checks, Playwright's.
  test: { include: ['tests/**/*.unit.spec.ts'], passWithNoTests: true },
};
