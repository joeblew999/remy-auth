import type { Vocabulary } from './relations.js';

export declare function apiChecks(options: { router: unknown; title: string; origins?: readonly string[]; personFields?: readonly string[]; errorStatuses?: Readonly<Record<string, number>>; vocabulary?: Vocabulary }): void;
