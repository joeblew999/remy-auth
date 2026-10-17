import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { options as paraglide } from './packages/ui/paraglide.mjs';

// remy-auth's app: the shared app configuration (@joeblew999/remy-ui/app/vite), with every app's Vite Plus tasks
// and style, plus what is remy-auth's alone: the Paraglide compiler for the shared catalogs this repository owns
// (packages/ui/messages), the command line built as an installed app runs it, and the release's publish. Its folder
// is this file's, never the folder a tool happened to start in (Vite Plus loads every workspace's config from the root).
export default remyApp({
  plugins: [paraglideVitePlugin(paraglide)],
  root: import.meta.dirname,
  tasks: {
    // The command line as an installed app runs it (JavaScript, packages/ui/cli): what the bin's unit check runs,
    // and what the package ships.
    cli: { command: 'tsc -p packages/ui/src/cli', cache: { input: [{ auto: true }, '!packages/ui/cli/**'] } },
    // The plain-function checks, the bin's among them, which runs the built command line.
    'check:unit': {
      command: 'TEST_TARGET=unit playwright test --project=unit --pass-with-no-tests',
      dependsOn: ['cli', 'check:commands', 'generate'],
      cache: {
        input: [{ auto: true }, '!test-results/**', '!playwright-report/**'],
        output: [{ auto: true }, '!test-results/**', '!playwright-report/**'],
      },
    },
    // The release's publish (GitHub's release job, for a version tag): each package whose version is new on its
    // registry, then the GitHub release (`vp run publish --release vX.Y.Z`).
    publish: { command: 'node packages/ui/src/cli/remy.ts packages publish', cache: false },
  },
});
