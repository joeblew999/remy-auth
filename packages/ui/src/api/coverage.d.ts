export declare const apiPrefix: '/api/';
export declare function procedures(router: unknown): { path: string; procedure: unknown }[];
/** A procedure's `openapi()` metadata: its HTTP method and path, and its document fields. */
export declare function routeOf(procedure: unknown): { method?: string; path?: string; summary?: string; description?: string; tags?: readonly string[] };
/** The HTTP status each error code answers with: oRPC's common codes, then the API's own. */
export declare function statusesOf(errorStatuses?: Readonly<Record<string, number>>): Record<string, number>;
export declare function coverageProblems(router: unknown, options?: { errorStatuses?: Readonly<Record<string, number>> }): string[];
