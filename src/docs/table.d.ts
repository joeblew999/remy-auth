export type DocsRow = { file: string; slug: string };
export declare const repository: string;
export declare const branch: string;
export declare const docsTable: DocsRow[];
/** A page's title: the file's first "# " heading. */
export declare const firstHeading: (source: string) => string;
export declare const docsLocale: 'en';
export declare const docsI18nDir: string;
export declare const docsTranslationFile: (file: string, locale: string) => string;
export declare const docsFile: (row: { file: string }, locale: string, exists: (file: string) => boolean) => string;
export declare const docsLangs: (row: { file: string }, locales: readonly string[], exists: (file: string) => boolean) => string[];
export declare const docsTranslationOf: (path: string) => { locale: string; row: DocsRow } | undefined;
export declare const docsPath: (slug: string) => string;
export declare const docsPaths: string[];
export declare const docsRowForFile: (file: string) => DocsRow | undefined;
export declare const docsRowForSlug: (slug: string) => DocsRow | undefined;
export declare const docsObjectKey: (slug: string, locale?: string) => string;
export declare const docsObjectForKey: (key: string) => { row: DocsRow; locale: string } | undefined;
export declare const docsRowForObjectKey: (key: string) => DocsRow | undefined;
