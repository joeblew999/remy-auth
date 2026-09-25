/**
 * What every contract procedure declares besides its route. `policy` names who may call it:
 * "public", or later an action of refined C's relation engine (.plans/auth-service.md).
 */
export type ApiMeta = { policy?: 'public' };
export declare const apiPrefix: '/api/';
export declare function procedures(router: unknown): { path: string; procedure: unknown }[];
export declare function coverageProblems(router: unknown): string[];
