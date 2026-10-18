import type { RemyProject } from '@joeblew999/remy-cli/project';

// Where this app is deployed: the one place the tooling (remy cloudflare, remy test) reads it.
export default {
  origins: {
    production: 'https://my-app.example.workers.dev',
    docs: 'https://my-app-docs.example.workers.dev',
  },
} satisfies RemyProject;
