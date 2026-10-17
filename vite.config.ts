import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { options as paraglide } from './packages/ui/paraglide.mjs';

// remy-auth's app: the shared app configuration (@joeblew999/remy-ui/app/vite), plus the Paraglide compiler
// for the shared catalogs, which this repository owns (packages/ui/messages). Its folder is this file's, never
// the folder a tool happened to start in (Vite+ loads every workspace's config from the root).
const app = remyApp({ plugins: [paraglideVitePlugin(paraglide)], root: import.meta.dirname });

// Trial: the tasks Vite+ runs and caches (vp run <task>). Files the tooling generates are its outputs, never
// its inputs: a task that rewrites what it reads can never be skipped.
const generated = ['!packages/ui/src/paraglide/**', '!packages/ui/cli/**', '!src/paraglide/**', '!src/routeTree.gen.ts',
  '!worker-configuration.d.ts', '!node_modules/**', '!.remy-docs/**', '!docs/.remy-docs/**', '!dist/**', '!docs/dist/**',
  '!test-results/**', '!playwright-report/**', '!**/.wrangler/**'];

export default {
  ...app,
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
        cache: { input: [{ auto: true }, ...generated, '!.git/**'], untrackedEnv: ['REMY_FLOW', 'GITHUB_ACTIONS', 'PREVIEW_PORT'] },
      },
      check: {
        command: 'node packages/ui/src/cli/remy.ts check',
        cache: { input: [{ auto: true }, ...generated], untrackedEnv: ['REMY_FLOW', 'GITHUB_ACTIONS'] },
      },
    },
  },
};
