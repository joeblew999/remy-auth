import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { options as paraglide } from './packages/ui/paraglide.mjs';

// remy-auth's app: the shared app configuration (@joeblew999/remy-ui/app/vite), plus the Paraglide compiler
// for the shared catalogs, which this repository owns (packages/ui/messages). Its folder is this file's, never
// the folder a tool happened to start in (Vite+ loads every workspace's config from the root).
const app = remyApp({ plugins: [paraglideVitePlugin(paraglide)], root: import.meta.dirname });

// Trial: the tasks Vite+ runs and caches (vp run <task>). Files the tooling generates are its outputs, never
// its inputs: a task that rewrites what it reads can never be skipped.
const generated = [
  '!packages/ui/src/paraglide/**',
  '!packages/ui/cli/**',
  '!src/paraglide/**',
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

export default {
  ...app,
  // The formatter (vp fmt), set to the style this code was written in: single quotes, 120 columns. Code and config only:
  // Markdown is prose whose layout is its author's, and the translations are fingerprinted from it. Generated files
  // are their generator's.
  fmt: {
    singleQuote: true,
    printWidth: 120,
    ignorePatterns: ['**/*.md', '**/*.mdx', '**/routeTree.gen.ts', '**/worker-configuration.d.ts', '**/paraglide/**'],
  },
  // Lint and Vite+'s type check (vp check). template/ and the fixture's files are other apps' source, with their own
  // tsconfig and dependencies, never installed here: the new-app test checks them as an installed app.
  lint: { options: { typeAware: true, typeCheck: true }, ignorePatterns: ['template/**', 'fixtures/**'] },
  run: {
    tasks: {
      build: {
        command: 'vp build .',
        cache: { input: [{ auto: true }, ...generated], output: ['dist/**'] },
      },
      browser: {
        command: 'node packages/ui/src/cli/remy.ts ci browser --everything',
        dependsOn: ['build'],
        cache: {
          input: [{ auto: true }, ...generated, '!.git/**'],
          untrackedEnv: ['REMY_FLOW', 'GITHUB_ACTIONS', 'PREVIEW_PORT'],
        },
      },
      // What the type check needs and git does not hold: the compiled UI text (Paraglide) and the Worker's binding
      // types, after the docs' own (their package's generate task). Each step reads the file it is about to rewrite:
      // what it writes is its output (restored on a cache hit), never its input.
      generate: {
        command: ['node packages/ui/paraglide.mjs', 'wrangler types'],
        dependsOn: ['@joeblew999/remy-auth-docs#generate'],
        cache: { input: [{ auto: true }, '!packages/ui/src/paraglide/**', '!worker-configuration.d.ts'] },
      },
      // The command line as an installed app runs it (JavaScript, packages/ui/cli): what the bin's unit check runs,
      // and what the package ships.
      cli: {
        command: 'tsc -p packages/ui/src/cli',
        cache: { input: [{ auto: true }, '!packages/ui/cli/**'] },
      },
      // The project's own checks, each one of its tools, run as a tool. Under REMY_FLOW=ci (here and on GitHub) the
      // ones that would fix something only verify it, so the variable is part of what is cached.
      'check:plans': 'node packages/ui/src/cli/remy.ts plans check',
      'check:single-copies': 'node packages/ui/src/cli/remy.ts check single-copies',
      // It writes COMMANDS.md (here and the blank app's): its output, never its input.
      'check:commands': {
        command: 'node packages/ui/src/cli/remy.ts check commands',
        cache: { env: ['REMY_FLOW'], input: [{ auto: true }, '!COMMANDS.md', '!template/COMMANDS.md'] },
      },
      'check:endings': { command: 'node packages/ui/src/cli/remy.ts check endings', cache: { env: ['REMY_FLOW'] } },
      'check:translations': 'node packages/ui/src/cli/remy.ts check translations',
      // The checks that are plain functions (tests/**/*.unit.spec.ts): no Worker, no browser. The bin's check runs
      // the built command line; the commands list is current before them, since one checks it.
      'check:unit': {
        command: 'TEST_TARGET=unit playwright test --project=unit --pass-with-no-tests',
        dependsOn: ['cli', 'check:commands', 'generate'],
        // Playwright's record of its last run and its report: temporary, neither input nor output.
        cache: {
          input: [{ auto: true }, '!test-results/**', '!playwright-report/**'],
          output: [{ auto: true }, '!test-results/**', '!playwright-report/**'],
        },
      },
      // The check: Vite+'s own (format, lint, types: the app's, the docs', the command line's) once everything it
      // reads exists, the app and the docs built (the route tree, every docs page compiling, translations included),
      // and the project's own checks passed.
      check: {
        command: 'vp check',
        dependsOn: [
          'generate',
          'build',
          '@joeblew999/remy-auth-docs#build',
          'check:plans',
          'check:single-copies',
          'check:commands',
          'check:endings',
          'check:translations',
          'check:unit',
        ],
      },
    },
  },
};
