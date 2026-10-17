import { remyWorkspace } from '@joeblew999/remy-ui/workspace';

// remy-auth's workspace (apps/*, packages/*): the style, the workspace's tasks and the app's under the same names, from
// the package (@joeblew999/remy-ui/workspace), plus what is remy-auth's alone: its unit checks run the command line
// as an installed app does (the package's cli task), the new-app test, and the release's publish.
export default remyWorkspace({
  root: import.meta.dirname,
  ci: ['vp run new-app'],
  tasks: {
    'check:unit': {
      command: 'vp test',
      dependsOn: ['check:commands', 'remy-auth#generate', '@joeblew999/remy-ui#cli'],
      cache: { input: [{ auto: true }, '!**/node_modules/.*/**'], output: [{ auto: true }, '!**/node_modules/.*/**'] },
    },
    // The new-app test: a brand-new app from template/ on this commit's packages, through its own tasks.
    'new-app': { command: 'bash fixtures/consumer/run.sh', cache: false },
    // The release's publish (GitHub's release job, for a version tag): each package whose version is new on its
    // registry, then the GitHub release (`vp run publish --release vX.Y.Z`).
    publish: { command: 'node packages/ui/src/cli/remy.ts packages publish', cache: false },
  },
});
