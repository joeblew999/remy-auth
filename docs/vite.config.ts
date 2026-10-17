import { remyDocs } from '@joeblew999/remy-ui/docs/vite';
import { docsConfig } from './docs.config.ts';

// This app's docs Worker: @joeblew999/remy-ui's, over content/ and docs.config.ts, documenting this app's API.
const docs = remyDocs(docsConfig, { contract: '@joeblew999/remy-auth-contract', root: import.meta.dirname });

// What the docs' type check needs and git does not hold: the build writes .remy-docs/ (the content index and the
// Worker's configuration), then the Worker's binding types.
export default {
  ...docs,
  run: {
    tasks: {
      generate: {
        command: ['vp build', 'wrangler types -c .remy-docs/wrangler.json'],
        // What the steps write (the build's .remy-docs/, dist/ and .wrangler/, the binding types) is their output, never their input.
        cache: { input: [{ auto: true }, '!.remy-docs/**', '!dist/**', '!.wrangler/**', '!worker-configuration.d.ts'] },
      },
    },
  },
};
