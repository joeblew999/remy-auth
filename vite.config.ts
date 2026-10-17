import { remyWorkspace } from '@joeblew999/remy-ui/workspace';

// remy-auth's workspace (apps/*, packages/*): the style, the workspace's tasks and the app's under the same names, from
// the package (@joeblew999/remy-ui/workspace), plus what is remy-auth's alone: its unit checks run the command line
// as an installed app does (the package's cli task), the new-app test, the release's checks and its publish.
export default remyWorkspace({
  root: import.meta.dirname,
  ci: ['vp run new-app'],
  tasks: {
    'check:unit': {
      command: 'vp test',
      dependsOn: ['check:commands', 'remy-auth#generate', '@joeblew999/remy-ui#cli'],
      cache: { input: [{ auto: true }, '!**/node_modules/.*/**'], output: [{ auto: true }, '!**/node_modules/.*/**'] },
    },
    // What the package ships that git does not hold: its catalogs (src/paraglide) and its command line (cli/).
    // The new-app test packs it, and the release publishes it.
    'new-app': {
      command: 'bash fixtures/consumer/run.sh',
      dependsOn: ['@joeblew999/remy-ui#generate', '@joeblew999/remy-ui#cli'],
      cache: false,
    },
    // The release's publish (GitHub's release job, for a version tag): each package whose version is new on its
    // registry, then the GitHub release (`vp run publish --release vX.Y.Z`).
    publish: {
      command: 'node packages/ui/src/cli/remy.ts packages publish',
      dependsOn: ['@joeblew999/remy-ui#generate', '@joeblew999/remy-ui#cli'],
      cache: false,
    },
    // remy-auth's own release checks (vp run release runs them): the blank app's pins, then shadcn's files as its CLI
    // writes them.
    'release-checks': { command: ['vp run template:check', 'vp run ui:verify'], cache: false },
  },
});
