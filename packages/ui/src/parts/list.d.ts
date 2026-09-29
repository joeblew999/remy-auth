/** A part's name: the platform's, or another package's part by its own name. */
export type PartName = 'seo-routes' | 'time-zones' | 'deferred-place' | 'status-card' | (string & {});
export type PartEntry = {
  routes: boolean;
  requires: PartName[];
  entries: Record<string, string[]>;
  app: string[];
  sitePaths: string[];
};
export declare const catalog: Record<string, PartEntry>;
export declare const partsFile: string;
export declare function partAppFile(name: PartName): string;
/** The app's listed parts by name, each with its folder and how it was listed. */
export declare function listedParts(options?: { root?: string; file?: string }): Record<string, PartEntry & { dir: string; spec: string }>;
export declare function readParts(options?: { root?: string; file?: string }): PartName[];
export declare function partSitePaths(listed: ReturnType<typeof listedParts>): string[];
/** A part the app does not list: the platform's, or the first dependency offering it. */
export declare function offeredPart(name: string, options?: { root?: string }): PartEntry | undefined;
