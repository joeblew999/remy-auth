import type { RemyProject } from '@joeblew999/remy-ui/project';

// Where remy-auth is deployed and its local ports: the one place the tooling reads them (npm run
// dev:*). mise.toml's [env] says the same until mise goes (.plans/tooling-in-typescript.md).
export default {
  origins: {
    production: 'https://remy-auth.gedw99.workers.dev',
    staging: 'https://remy-auth-staging.gedw99.workers.dev',
    docs: 'https://remy-auth-docs.gedw99.workers.dev',
  },
  ports: { preview: 4173, docsPreview: 4174 },
  release: { package: '@joeblew999/remy-ui', title: 'Shared UI' },
} satisfies RemyProject;
