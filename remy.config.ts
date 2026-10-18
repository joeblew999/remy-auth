import type { RemyProject } from '@joeblew999/remy-cli/project';

// Where remy-auth is deployed and its release package: the one place the tooling reads them.
export default {
  origins: {
    production: 'https://remy-auth.gedw99.workers.dev',
    staging: 'https://remy-auth-staging.gedw99.workers.dev',
    docs: 'https://remy-auth-docs.gedw99.workers.dev',
  },
  release: { package: '@joeblew999/remy-ui', title: 'Shared UI' },
} satisfies RemyProject;
