/** Where the docs Worker (docs/) answers: its own origin, given at build (mise.toml [env] VITE_DOCS_ORIGIN). */
export const docsOrigin: string = import.meta.env?.VITE_DOCS_ORIGIN ?? 'https://remy-auth-docs.gedw99.workers.dev';
