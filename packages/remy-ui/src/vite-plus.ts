// Two plain settings every Remy repository's Vite Plus configuration uses. Settings only: no task is made here; each
// vite.config.ts writes its own tasks out, where they can be read.

/**
 * The machine's way to the network (its proxy and the certificates the proxy needs), for a cached task that may
 * download: a cached task sees only the variables it names, and without these the catalogs' compiler cannot fetch its
 * message-format plugin behind a proxy and compiles no messages, silently (a new app in a cloud container,
 * 2026-10-17). Untracked: where the network is never changes what a task makes.
 */
export const network: string[] = [
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

/** The formatter, the linter, the commit hook's step and the unit checks: one style for every repository. */
export const style: {
  fmt: Record<string, unknown>;
  lint: Record<string, unknown>;
  staged: Record<string, string>;
  test: Record<string, unknown>;
} = {
  // Code and config only: Markdown is prose whose layout is its author's, and the translations are fingerprinted
  // from it. Generated files are their generator's.
  fmt: {
    singleQuote: true,
    printWidth: 120,
    ignorePatterns: ['**/*.md', '**/*.mdx', '**/routeTree.gen.ts', '**/worker-configuration.d.ts', '**/paraglide/**'],
  },
  // Vite Plus's type check runs inside its lint (typeAware and typeCheck), so `vp check` is format, lint and types.
  // template/ and fixtures/ are other apps' source in remy-auth, checked as installed apps by the new-app test.
  // Vite Plus's own lint plugin, as `vp create` sets it up: imports from vite-plus, not the tools it wraps.
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['template/**', 'fixtures/**'],
    // The unit checks get Oxlint's Vitest rules (focused or disabled tests, expects outside a test); Vitest's
    // expect(value, message) takes the message second.
    overrides: [
      { files: ['**/*.unit.spec.ts'], plugins: ['vitest'], rules: { 'vitest/valid-expect': ['warn', { maxArgs: 2 }] } },
    ],
  },
  // vp staged (the pre-commit hook, .vite-hooks/pre-commit): the staged files formatted and their lint fixes applied.
  staged: { '*': 'vp check --fix' },
  // vp test: the plain-function checks only; tests/*.spec.ts are the browser checks, Playwright's.
  // `vp run coverage` (vp test run --coverage) prints how much of the code they reach; information, not a gate.
  test: {
    include: ['tests/**/*.unit.spec.ts'],
    passWithNoTests: true,
    coverage: { provider: 'v8', reporter: ['text-summary'] },
  },
};
