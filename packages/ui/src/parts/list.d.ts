export type PartName = 'time-zones' | 'deferred-place' | 'seo-routes' | 'status-card';
export declare const catalog: Record<PartName, {
  routes: boolean;
  requires: PartName[];
  entries: Record<string, string[]>;
  app: string[];
  sitePaths: string[];
}>;
export declare const partsFile: string;
export declare function partAppFile(name: PartName): string;
export declare function readParts(options?: { root?: string; file?: string }): PartName[];
export declare function partSitePaths(names: readonly PartName[]): string[];
