/** Site pages: for Google, complete without JavaScript, indexed and in the sitemap. */
export declare const sitePaths: string[];
/** App pages under /app: need JavaScript, noindex, not in the sitemap. */
export declare const appPaths: string[];
/** Every page, both kinds. */
export declare const allPaths: string[];
/** Whether a de-localized path is an app page. */
export declare const isAppPath: (path: string) => boolean;
