/** Where the docs Worker (docs/) answers: its own origin, given at build (remy.config.ts's origins.docs, as VITE_DOCS_ORIGIN). */
export const docsOrigin: string = import.meta.env?.VITE_DOCS_ORIGIN ?? 'https://remy-auth-docs.gedw99.workers.dev';
