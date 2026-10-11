import type { RemyProject } from '@joeblew999/remy-ui/project';

// Where this app is deployed and its local ports: the one place the tooling (npm run dev:*) reads
// them. A worktree computes its own ports from its name.
export default {
  origins: {
    production: 'https://my-app.example.workers.dev',
    docs: 'https://my-app-docs.example.workers.dev',
  },
  ports: { preview: 4173, docsPreview: 4174 },
} satisfies RemyProject;
