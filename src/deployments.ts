/**
 * Where this app is deployed, for the Settings page's "What is deployed": each is asked what it is
 * running. The origins are mise.toml's ([env] DEPLOY_ORIGIN and STAGING_ORIGIN, given to the page as
 * VITE_*); the names are what the Worker itself calls its environment (wrangler.jsonc).
 */
export const deployments = [
  { name: 'production', origin: import.meta.env?.VITE_DEPLOY_ORIGIN ?? 'https://remy-auth.gedw99.workers.dev' },
  { name: 'staging', origin: import.meta.env?.VITE_STAGING_ORIGIN ?? 'https://remy-auth-staging.gedw99.workers.dev' },
] as const;
