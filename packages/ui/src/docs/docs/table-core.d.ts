export type SiteName = 'docs' | 'dev';
export type DocsRow = { site: SiteName; base: string; slug: string };
export type DocsSite = { dir: string; meta: { title?: string; pages: string[] }; defaultLanguage: string; languages: string[] };
type SiteFiles = { meta: { title?: string; pages: string[] }; i18n: { defaultLanguage: string; languages: string[] } };
export type DocsTable = {
  repository: string;
  branch: string;
  docsSites: Record<SiteName, DocsSite>;
  docsTable: DocsRow[];
  docsUrl: (site: SiteName, slug: string, lang?: string) => string;
  docsFile: (row: DocsRow, lang: string, exists: (file: string) => boolean) => string;
  docsLangs: (row: DocsRow, exists: (file: string) => boolean) => string[];
  docsObjectKey: (site: SiteName, slug: string, lang: string) => string;
  docsObjectForKey: (key: string) => { row: DocsRow; lang: string } | undefined;
  docsLangOfPath: (pathname: string) => { site: SiteName; lang: string } | undefined;
};
export declare function docsTableOf(files: { users: SiteFiles; dev: SiteFiles }, docsConfig: { repository: string; branch: string }): DocsTable;
