import { network, style } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';

// remy-auth's workspace: apps/* (the app, its docs), packages/* (remy-ui, remy-cli, the contract, the showcase). Each
// package's tasks are in its own vite.config.ts; here, the style for all of them and the repository's own tasks: its
// checks, `ready` (every check, the builds included), the new-app test, the release's checks and its publish. The
// package.json scripts compose them (`vp run ci`, `vp run release`).
const check = 'node packages/remy-cli/src/checks.ts';
const remy = 'node packages/remy-cli/src/remy.ts';

export default defineConfig({
  ...style,
  // Bare `vp dev`, `vp build` and `vp preview` here act on the app (Vite Plus's own tools, without its tasks' preparation:
  // `vp run dev` and `vp run build` are those).
  defaultPackage: './apps/remy-auth',
  run: {
    tasks: {
      // The project's own checks (remy-check). A check never writes: `vp run fix` writes what two of them report.
      'check:plans': `${check} plans`,
      'check:single-copies': `${check} single-copies`,
      'check:commands': `${check} commands`,
      'check:endings': `${check} endings`,
      'check:translations': `${check} translations`,
      // The plain-function checks (tests/**/*.unit.spec.ts) on Vite Plus's test runner: no Worker, no browser. They
      // run the command line as an installed app does (remy-cli's dist/). Vitest's own caches (hidden folders under
      // node_modules) are neither input nor output.
      'check:unit': {
        command: 'vp test',
        dependsOn: ['check:commands', 'remy-auth#generate', '@joeblew999/remy-cli#build'],
        cache: {
          input: [{ auto: true }, '!**/node_modules/.*/**'],
          output: [{ auto: true }, '!**/node_modules/.*/**'],
        },
      },
      // Every check, after every change: Vite Plus's own (format, lint, types) once everything it reads exists (the
      // app and its docs built: the route tree, every docs page compiling, translations included), Wrangler's
      // deployment dry run, the project's own checks and the unit checks.
      ready: {
        command: 'vp check',
        dependsOn: [
          'remy-auth#generate',
          'remy-auth#build',
          'remy-auth#check:deploy',
          '@joeblew999/remy-auth-docs#build',
          '@joeblew999/remy-auth-docs#check:deploy',
          'check:plans',
          'check:single-copies',
          'check:commands',
          'check:endings',
          'check:translations',
          'check:unit',
        ],
      },
      // What the checks only verify, written: the commands list (COMMANDS.md) and each docs page's ending.
      fix: { command: [`${check} commands --write`, `${check} endings --write`], cache: false },
      // The remy skill remy-ui ships, read from the docs as AI tools read them (llms.txt), from the docs build.
      'skills:build': {
        command: `${remy} skills build`,
        dependsOn: ['@joeblew999/remy-auth-docs#build'],
        cache: {
          input: [{ auto: true }, '!packages/remy-ui/skills/**', '!**/.wrangler/**'],
          output: ['packages/remy-ui/skills/**'],
          untrackedEnv: ['DOCS_PREVIEW_PORT'],
        },
      },
      // A new app from the blank one (template/), on this commit's packages, packed: it installs, builds and passes
      // its checks. Cached on what a new app is made of, so a change to remy-auth's own app or its product docs runs it
      // no more (~3 minutes). It writes nothing here: its app lives in a scratch folder.
      'new-app': {
        command: 'bash fixtures/consumer/run.sh',
        dependsOn: ['@joeblew999/remy-ui#generate', '@joeblew999/remy-cli#build', 'skills:build'],
        cache: {
          input: [
            'template/**',
            'fixtures/**',
            'apps/remy-auth-docs/content/dev/**',
            'packages/**',
            'package-lock.json',
            '!**/node_modules/**',
            '!**/paraglide/**',
            '!packages/remy-cli/dist/**',
            '!packages/remy-ui/skills/**',
          ],
          output: [],
          untrackedEnv: [...network, 'GITHUB_TOKEN', 'NODE_AUTH_TOKEN', 'PREVIEW_PORT', 'DOCS_PREVIEW_PORT'],
        },
      },
      // The release's publish (GitHub's release job, for a version tag): each package whose version is new on its
      // registry, then the GitHub release (`vp run publish --release vX.Y.Z`); rehearsed by `vp run release`.
      publish: {
        command: `${remy} packages publish`,
        dependsOn: ['@joeblew999/remy-ui#generate', '@joeblew999/remy-cli#build', 'skills:build'],
        cache: false,
      },
      'publish:rehearse': {
        command: `${remy} packages publish --dry-run`,
        dependsOn: ['@joeblew999/remy-ui#generate', '@joeblew999/remy-cli#build', 'skills:build'],
        cache: false,
      },
    },
  },
});
