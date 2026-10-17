// The tasks every Remy repository runs through Vite Plus (`vp run <task>`), defined once, here. Vite Plus decides what
// runs, in what order and what it can skip (its cache); each task runs one tool, visibly
// (.plans/2026-10-17-02-vite-plus.md). Two scopes, as in Vite Plus's own workspaces:
//   the app's (its own folder): local, generate, dev, build, preview, browsers and the browser checks;
//   the workspace's (the repository's root): the project's own checks, the unit checks, vp check, fix and ci.
// An app that is its own repository (one folder, `export default remyApp()`) has both. In a workspace (remy-auth:
// apps/*, packages/*), remyApp() gives each app its own and remyWorkspace() the root the rest, with tasks of the app's
// names at the root that run the app's (`vp run build` is `vp run remy-auth#build`), so every repository answers to
// the same names. What differs is read from the folders, never set: remy-auth runs the command line's source, an app
// the installed `remy`; an app with project.inlang compiles its own strings; one with scripts/local.ts prepares its
// local state; one with a docs package checks it too.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/** What a task writes and never reads as an input: generated files, builds, test results, local state. */
export const generated = [
  '!**/paraglide/**',
  '!**/cli/**/*.js',
  '!**/cli/**/*.d.ts',
  '!**/routeTree.gen.ts',
  '!**/worker-configuration.d.ts',
  '!**/node_modules/**',
  '!**/.remy-docs/**',
  '!**/dist/**',
  '!**/test-results/**',
  '!**/playwright-report/**',
  '!**/.wrangler/**',
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

/** What a browser run reads that is not what it tests: its own results, Wrangler's local state, tools' caches. */
const browserInputs = [
  { auto: true },
  '!**/test-results/**',
  '!**/playwright-report/**',
  '!**/.wrangler/**',
  '!**/node_modules/.*/**',
];

/** GitHub's jobs, one `vp run <task>` each, in parallel (the workflow is held to this list by a unit check). */
export const githubJobs = (shards = 3) => [
  'check',
  ...Array.from({ length: shards }, (_, i) => `test:browser --shard ${i + 1}/${shards}`),
  'test:audits',
];

const json = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** The workspace an app folder belongs to: the nearest folder above it whose package.json lists workspaces. */
function workspaceOf(root) {
  for (let dir = dirname(resolve(root)); dir !== dirname(dir); dir = dirname(dir)) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest) && json(manifest).workspaces) return dir;
  }
  return undefined;
}

/** How a task in `root` runs the command line and the checks: remy-auth's source, or the installed bins. */
function commandLine(root, workspace = root) {
  const source = join(workspace, 'packages/ui/src/cli');
  if (!existsSync(join(source, 'remy.ts'))) return { remy: 'remy', check: 'remy-check' };
  const at = relative(root, source) || '.';
  return { remy: `node ${at}/remy.ts`, check: `node ${at}/checks.ts` };
}

/** Whether the app at `root` is its own repository (not a member of a workspace above it). */
export const standalone = (root) => !workspaceOf(root);

/** The packages under a workspace's folders whose package.json says they are an app (has a wrangler config) or docs. */
function members(workspace) {
  /** @type {{ apps: string[]; docs: string[] }} */
  const found = { apps: [], docs: [] };
  const dirs = (json(join(workspace, 'package.json')).workspaces ?? []).flatMap((pattern) => {
    if (!pattern.endsWith('/*')) return [pattern];
    const parent = join(workspace, pattern.slice(0, -2));
    return existsSync(parent) ? readdirSync(parent).map((name) => `${pattern.slice(0, -2)}/${name}`) : [];
  });
  for (const dir of dirs) {
    const manifest = join(workspace, dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name } = json(manifest);
    if (existsSync(join(workspace, dir, 'docs.config.ts'))) found.docs.push(name);
    else if (existsSync(join(workspace, dir, 'wrangler.jsonc'))) found.apps.push(name);
  }
  return found;
}

/** The app's own tasks: what its folder builds, serves and tests in a browser. */
function appTasks(root, { remy }) {
  const has = (path) => existsSync(resolve(root, path));
  // The strings the type check needs compiled: the app's own, when it has them; a workspace package's (remy-auth's
  // shared catalogs) through that package's generate task, which `from: dependencies` runs first.
  const catalog = has('project.inlang') ? ['node node_modules/@joeblew999/remy-ui/src/app-catalog.js'] : [];
  const local = has('scripts/local.ts');
  const prepared = [...(local ? ['local'] : []), 'generate'];
  return {
    // The app's local state: .dev.vars, the migrations on Wrangler's local databases, whatever else the app's
    // scripts/local.ts sets up. Every time: it applies only what is missing.
    ...(local ? { local: { command: 'node scripts/local.ts', cache: false } } : {}),
    // What the type check needs and git does not hold: the compiled strings and the Worker's binding types. Each step
    // reads the file it is about to rewrite: what it writes is its output, never its input.
    generate: {
      command: [...catalog, 'wrangler types'],
      dependsOn: [{ task: 'generate', from: 'dependencies' }],
      cache: { input: [{ auto: true }, '!**/paraglide/**', '!worker-configuration.d.ts'], untrackedEnv: network },
    },
    // The build's folder emptied before the build runs or comes from the cache: a cache hit restores the build's files
    // over what is there and removes nothing, so an earlier build's chunks would stay beside them (a browser check
    // found one, 2026-10-17: a chunk no page loads).
    clean: { command: `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"`, cache: false },
    // vp dev, vp build and vp preview are Vite Plus's own; these are the app's, with what they need first.
    dev: { command: 'vp dev', dependsOn: prepared, cache: false },
    // The production build, then Wrangler's deployment dry run (no upload). Its stamp names the commit it was built
    // from (build-vite.js, through git, which Vite Plus does not see): git's record of the current commit is an input
    // too, so a new commit builds again.
    build: {
      command: ['vp build', 'wrangler deploy --dry-run'],
      dependsOn: [...prepared, 'clean'],
      cache: {
        input: [
          { auto: true },
          ...generated,
          { pattern: '.git/HEAD', base: 'workspace' },
          { pattern: '.git/refs/heads/**', base: 'workspace' },
          { pattern: '.git/packed-refs', base: 'workspace' },
        ],
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
    // What a browser check needs on this machine: Playwright's Chromium and, on Linux, a Han font (remy browsers).
    browsers: { command: `${remy} browsers`, cache: false },
    // The browser checks on the production build, every language (CHECK_LOCALES=quick: a few), Playwright's own
    // options passed through (`vp run test:browser --shard 1/3`, `--grep <words>`). The build they test is an
    // input; Playwright's results and Wrangler's local state are neither input nor output.
    'test:browser': {
      command: 'playwright test --project=ours',
      dependsOn: ['build', 'browsers'],
      cache: {
        env: ['CHECK_LOCALES'],
        untrackedEnv: ['PREVIEW_PORT', ...network],
        input: browserInputs,
        output: [],
      },
    },
    // Google's Lighthouse audits on the production build. `vp run ci` runs them after the browser checks, never
    // beside them: they measure speed.
    'test:audits': {
      command: 'playwright test --project=google',
      dependsOn: ['build', 'browsers'],
      cache: { untrackedEnv: ['PREVIEW_PORT', ...network], input: browserInputs, output: [] },
    },
  };
}

/**
 * The workspace's tasks: the project's own checks, the unit checks, vp check over everything, fix and ci. `before`:
 * what the check needs built and generated first (the app's tasks, by name, `pkg#task` in a workspace).
 */
function workspaceTasks({ check }, before, ciAfterCheck) {
  return {
    // The project's own checks (remy-check, the package's plain tool for them). A check never writes: `vp run fix`
    // writes what the two that could fix something report.
    'check:plans': `${check} plans`,
    'check:single-copies': `${check} single-copies`,
    'check:commands': `${check} commands`,
    'check:endings': `${check} endings`,
    'check:translations': `${check} translations`,
    // The checks that are plain functions (tests/**/*.unit.spec.ts), on Vite Plus's test runner: no Worker, no
    // browser. Vitest's own caches (node_modules/.vite, .vitest-cache: hidden folders) are neither input nor output.
    'check:unit': {
      command: 'vp test',
      dependsOn: ['check:commands', ...before.generate],
      cache: { input: [{ auto: true }, '!**/node_modules/.*/**'], output: [{ auto: true }, '!**/node_modules/.*/**'] },
    },
    // The check: Vite Plus's own (format, lint, types) once everything it reads exists, the app and its docs built
    // (the route tree, every docs page compiling, translations included), and the project's own checks passed.
    check: {
      command: 'vp check',
      dependsOn: [
        ...before.generate,
        ...before.build,
        'check:plans',
        'check:single-copies',
        'check:commands',
        'check:endings',
        'check:translations',
        'check:unit',
      ],
    },
    // What the check only verifies, written: the commands list (COMMANDS.md) and each docs page's ending.
    fix: { command: [`${check} commands --write`, `${check} endings --write`], cache: false },
    // What GitHub runs, the same here: the check, then the browser checks, then Google's audits, one after the other
    // (each `vp run` inlined as its own cached task). GitHub runs each part as a job of its own (githubJobs).
    ci: { command: ['vp run test:browser', 'vp run test:audits', ...ciAfterCheck], dependsOn: ['check'], cache: false },
  };
}

/**
 * The tasks of the app at `root`, from its folder: its own, and the workspace's too when it is its own repository.
 * `tasks` adds the app's own or replaces a shared one by name.
 */
export function remyTasks({ root = process.cwd(), tasks = {} } = {}) {
  const workspace = workspaceOf(root);
  const commands = commandLine(root, workspace ?? root);
  const own = appTasks(root, commands);
  if (workspace) return { ...own, ...tasks };
  const docs = existsSync(resolve(root, 'docs/package.json'))
    ? json(resolve(root, 'docs/package.json')).name
    : undefined;
  if (docs) own.generate.dependsOn.push(`${docs}#generate`);
  return {
    ...own,
    ...workspaceTasks(commands, { generate: ['generate'], build: ['build', ...(docs ? [`${docs}#build`] : [])] }, []),
    ...tasks,
  };
}

/** The formatter and the linter, one style for every repository. */
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

/**
 * A workspace root's Vite Plus configuration (remy-auth: apps/*, packages/*): the style, the workspace's tasks, and
 * tasks of the app's names that run the app's. `app`: the app package the names run (the only one, by default);
 * `tasks`: the repository's own, added (one of the same name replaces a shared one); `ci`: what CI runs after the
 * app's browser checks and audits (remy-auth: its new-app test).
 */
export function remyWorkspace({ root = process.cwd(), app, tasks = {}, ci = [] } = {}) {
  const found = members(root);
  const name = app ?? found.apps[0];
  if (!name) throw new Error(`remyWorkspace: no app package (one with a wrangler.jsonc) among ${root}'s workspaces`);
  const commands = commandLine(root);
  const passed = ['dev', 'build', 'preview', 'browsers', 'test:browser', 'test:audits'];
  return {
    ...style,
    run: {
      tasks: {
        // The app's tasks under the same names as in an app that is its own repository; arguments pass through
        // (`vp run test:browser --shard 1/3`).
        ...Object.fromEntries(passed.map((task) => [task, { command: `vp run ${name}#${task}`, cache: false }])),
        ...workspaceTasks(
          commands,
          {
            generate: [`${name}#generate`],
            build: [`${name}#build`, ...found.docs.map((docs) => `${docs}#build`)],
          },
          ci,
        ),
        ...tasks,
      },
    },
  };
}
