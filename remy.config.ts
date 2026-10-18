import type { RemyProject } from '@joeblew999/remy-cli/project';

// The package whose version names remy-auth's releases (the command line's packages commands read it). Where the app is
// deployed is its own .env (apps/remy-auth/.env, Vite's file).
export default {
  release: { package: '@joeblew999/remy-ui', title: 'Shared UI' },
} satisfies RemyProject;
