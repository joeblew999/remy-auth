export { buildChecks } from './build.checks.js';
/** The app frame's build stamp on the app page at `path`: the page's build, the environment off production, the reload control only when the deployment has moved on. */
export declare function buildStampChecks(options: { path: string }): void;
/** Every page's title ends with the app's own name, and an app of another name never shows the platform's (in English). */
export declare function productNameChecks(options: { paths: readonly string[] }): void;
