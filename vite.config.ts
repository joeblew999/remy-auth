import { network, style } from '@joeblew999/remy-ui/vite-plus';
import { defineConfig } from 'vite-plus';

// remy-auth's workspace: apps/* (the app, its docs), packages/* (remy-ui, remy-cli, the contract, the showcase). Each
// package's tasks are in its own vite.config.ts; here, the style for all of them and the repository's own tasks: its
// checks, `ready` (every check, the builds included), the new-app test and the release's publish. The package.json
// scripts compose them (`vp run ci`, `vp run release`).
const check = 'node packages/remy-cli/src/checks.ts';
const remy = 'node packages/remy-cli/src/remy.ts';
// What shadcn writes: its components, hooks and theme in remy-ui, and its utilities in the app.
const shadcnFiles = [
  'packages/remy-ui/src/components',
  'packages/remy-ui/src/hooks',
  'packages/remy-ui/src/styles',
  'apps/remy-auth/src/lib',
];

export default defineConfig({
  // A bare `vp create` here opens @joeblew999/create's templates (a new Remy app: vp create @joeblew999:app).
  create: { defaultTemplate: '@joeblew999' },
  // The shared style, each part by name (vp create and vp migrate read the keys written here).
  fmt: style.fmt,
  lint: style.lint,
  test: style.test,
  // Before a commit (vp staged): the shared style's formatting and lint fixes, and the shadcn check when a commit
  // stages a file shadcn writes.
  staged: {
    ...style.staged,
    [`{${shadcnFiles.join(',')}}/**`]: 'vp run check:shadcn',
  },
  // Bare `vp dev`, `vp build` and `vp preview` here act on the app (Vite Plus's own tools, without its tasks' preparation:
  // `vp run dev` and `vp run build` are those).
  defaultPackage: './apps/remy-auth',
  run: {
    tasks: {
      // The project's own checks (remy-check). A check never writes: `vp run fix` writes what two of them report.
      'check:wrangler': `${check} wrangler`,
      'check:commands': `${check} commands`,
      'check:endings': `${check} endings`,
      'check:translations': `${check} translations`,
      // The shadcn components and theme are exactly shadcn's: its own commands write them again, and git says whether
      // anything differs (a hand edit fails, and git diff shows it). It downloads and rewrites what it checks, so it
      // is never cached: the pre-commit hook runs it when a commit stages one of those files (staged, below).
      'check:shadcn': {
        command: `vp run ui:theme && vp run ui:components && vp fmt ${shadcnFiles.join(' ')} && git diff --exit-code -- ${shadcnFiles.join(' ')}`,
        cache: false,
      },
      // The plain-function checks (tests/**/*.unit.spec.ts) on Vite Plus's test runner: no Worker, no browser. They
      // run the command line as an installed app does (remy-cli's dist/); vp test reports Vitest's own caches itself.
      'check:unit': {
        command: 'vp test',
        dependsOn: ['check:commands', 'remy-auth#generate', '@joeblew999/remy-cli#pack', '@joeblew999/remy-ui#pack'],
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
          'check:wrangler',
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
      // A new app from the blank one (packages/create/templates/app), on this commit's packages, packed: it installs, builds and passes
      // its checks. Cached on what a new app is made of, so a change to remy-auth's own app or its product docs runs it
      // no more (~3 minutes). It writes nothing here: its app lives in a scratch folder.
      'new-app': {
        command: 'bash fixtures/consumer/run.sh',
        dependsOn: [
          '@joeblew999/remy-ui#pack',
          '@joeblew999/remy-cli#pack',
          '@joeblew999/remy-showcase#pack',
          'skills:build',
        ],
        cache: {
          input: [
            'packages/create/templates/app/**',
            'fixtures/**',
            'apps/remy-auth-docs/content/dev/**',
            'packages/**',
            'pnpm-lock.yaml',
            '!**/node_modules/**',
            '!**/paraglide/**',
            '!packages/*/dist/**',
            '!packages/remy-ui/skills/**',
          ],
          output: [],
          untrackedEnv: [...network, 'GITHUB_TOKEN', 'NODE_AUTH_TOKEN', 'PREVIEW_PORT', 'DOCS_PREVIEW_PORT'],
        },
      },
      // The upgrade test (issue #44): an app made from the latest published release, upgraded to this commit's packages
      // as projects.md says, then its own checks. It reads GitHub Packages, so it needs a token that reads packages
      // (GitHub's upgrade job has one; a cloud session's does not). Never cached: the previous release is the registry's.
      'upgrade-test': {
        command: 'bash fixtures/consumer/upgrade.sh',
        dependsOn: ['@joeblew999/remy-ui#pack', '@joeblew999/remy-cli#pack', 'skills:build'],
        cache: false,
      },
      // The release's publish (GitHub's release job, on a push to main): Changesets publishes each package whose
      // version is new on its registry (pnpm publish), after what the packages ship is generated and built.
      'release:publish': {
        command: 'changeset publish',
        dependsOn: [
          '@joeblew999/remy-ui#pack',
          '@joeblew999/remy-cli#pack',
          '@joeblew999/remy-showcase#pack',
          'skills:build',
        ],
        cache: false,
      },
    },
  },
});
