import { defineRemyProject } from '@joeblew999/remy-ui/project';

// Where remy-auth is deployed and its local ports: the one place the tooling reads them (npm run
// dev:*, remy). mise.toml's [env] says the same until mise goes (.plans/tooling-in-typescript.md).
export default defineRemyProject({
  origins: {
    production: 'https://remy-auth.gedw99.workers.dev',
    staging: 'https://remy-auth-staging.gedw99.workers.dev',
    docs: 'https://remy-auth-docs.gedw99.workers.dev',
  },
  ports: { preview: 4173, docsPreview: 4174 },
});
