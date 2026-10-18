/**
 * Where this app is deployed, for the Settings page's "What is deployed": each is asked what it is
 * running. The origins are this app's .env (VITE_*, which Vite gives the page); the names are what the Worker itself calls its environment (wrangler.jsonc).
 */
export const deployments = [
  { name: 'production', origin: import.meta.env?.VITE_DEPLOY_ORIGIN ?? 'https://remy-auth.gedw99.workers.dev' },
] as const;
