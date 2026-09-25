export type DocsRow = { file: string; slug: string };
export declare const repository: string;
export declare const branch: string;
export declare const docsTable: DocsRow[];
/** A page's title: the file's first "# " heading. */
export declare const firstHeading: (source: string) => string;
export declare const docsLocale: 'en';
export declare const docsPath: (slug: string) => string;
export declare const docsPaths: string[];
export declare const docsRowForFile: (file: string) => DocsRow | undefined;
export declare const docsRowForSlug: (slug: string) => DocsRow | undefined;
