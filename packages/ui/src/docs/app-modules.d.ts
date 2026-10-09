// The app's modules the docs Worker imports by name, not by path: the preset (vite.ts) points each at the
// app's own (remyDocs's `contract` option), so the package declares only their shape.

/** Whether the app has an API (remyDocs's `contract`): the reference exists only then. */
declare const __REMY_DOCS_API__: boolean;

declare module '@remy-docs-app/contract' {
  import type { AnyRouter } from '@orpc/server';
  /** The app's oRPC contract, which the API reference (/reference) documents. */
  export const contract: AnyRouter;
  /** Its OpenAPI info: title, version, description. */
  export const info: { title: string; version: string; description?: string };
  /** The HTTP status of each of the API's own error codes, when it has any. */
  export const errorStatuses: Readonly<Record<string, number>> | undefined;
}
