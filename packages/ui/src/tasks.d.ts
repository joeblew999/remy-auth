/** What a task writes and never reads as an input: generated files, builds, test results, local state. */
export declare const generated: string[];
/** The app's Vite Plus tasks, from its folder; `tasks` adds the app's own or replaces a shared one by name. */
export declare function remyTasks(options?: {
  root?: string;
  tasks?: Record<string, unknown>;
}): Record<string, unknown>;
/** GitHub's jobs, one `vp run <task>` each, in parallel. */
export declare function githubJobs(shards?: number): string[];
/** The formatter and the linter, one style for every app. */
export declare const style: { fmt: Record<string, unknown>; lint: Record<string, unknown> };
