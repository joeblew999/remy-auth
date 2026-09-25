export type Marker = { name: string; pattern: RegExp; source: URL | string | { package: string; from?: string } };
export declare const serverOnlyMarkers: Marker[];
export declare const devtoolsMarkers: Marker[];
export declare function buildBoundaryChecks(options: { paths: string[]; markers?: Marker[]; clientDir?: string }): void;
