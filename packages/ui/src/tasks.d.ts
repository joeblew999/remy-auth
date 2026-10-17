/** What a task writes and never reads as an input: generated files, builds, test results, local state. */
export declare const generated: string[];
/** The machine's network variables (proxy, certificates), untracked, for cached tasks that may download. */
export declare const network: string[];
/** GitHub's jobs, one `vp run <task>` each, in parallel. */
export declare function githubJobs(shards?: number): string[];
/** The tasks of the app at `root`: its own, and the workspace's too when it is its own repository. */
export declare function remyTasks(options?: {
  root?: string;
  tasks?: Record<string, unknown>;
}): Record<string, unknown>;
/** The formatter, the linter, the staged files and the unit checks: one style for every repository. */
export declare const style: Record<string, unknown>;
/** Whether the app at `root` is its own repository (not a member of a workspace above it). */
export declare function standalone(root: string): boolean;
/** A workspace root's Vite Plus configuration: the style, the workspace's tasks, and the app's under the same names. */
export declare function remyWorkspace(options?: {
  root?: string;
  app?: string;
  tasks?: Record<string, unknown>;
  ci?: string[];
}): Record<string, unknown>;
