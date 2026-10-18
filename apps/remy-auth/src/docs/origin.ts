/** Where the docs Worker answers: its own origin, from this app's .env (VITE_DOCS_ORIGIN). */
export const docsOrigin: string = import.meta.env?.VITE_DOCS_ORIGIN ?? 'https://remy-auth-docs.gedw99.workers.dev';
