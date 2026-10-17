import { remyDocs } from '@joeblew999/remy-ui/docs/vite';
import { docsConfig } from './docs.config.ts';

// This app's docs Worker: @joeblew999/remy-ui's, over content/ and docs.config.ts, documenting this app's API.
const docs = remyDocs(docsConfig, { contract: '@joeblew999/remy-auth-contract', root: import.meta.dirname });

// The docs' generated files (.remy-docs/: the content index, the Worker's configuration) are written when this
// configuration is loaded, which every vp command does; generate adds the Worker's binding types. build is the
// production build, which proves every page compiles, translations included. What each writes is its output,
// never its input.
export default {
  ...docs,
  run: {
    tasks: {
      generate: {
        command: 'wrangler types -c .remy-docs/wrangler.json',
        cache: { input: [{ auto: true }, '!worker-configuration.d.ts'] },
      },
      build: {
        command: 'vp build',
        dependsOn: ['generate'],
        cache: { input: [{ auto: true }, '!.remy-docs/**', '!dist/**', '!.wrangler/**'], output: ['dist/**'] },
      },
    },
  },
};
