export type PartName = 'time-zones';
export declare const catalog: Record<PartName, { routes: boolean; requires: PartName[] }>;
export declare const partsFile: string;
export declare function readParts(options?: { root?: string; file?: string }): PartName[];
