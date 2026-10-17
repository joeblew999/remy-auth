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
/** The flow's scripts, the same in every repository; `remy` is how it runs the command line. */
export declare function flowScripts(remy?: string): Record<string, string>;
/** The Git hooks every repository commits (.vite-hooks/), by file name. */
export declare const hookFiles: Record<string, string>;
/** The names an app's own script may not have: the shared tasks'. */
export declare function taskNames(): string[];
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
/** A worktree's own ports, from its name. */
export function portsFor(name: string): { preview: number; docsPreview: number };
/** The worktree's name when `cwd` is in one; the main checkout has none. */
export function worktreeName(cwd?: string): string | undefined;
/** The local ports at `root`: a worktree's own, else remy.config.ts's, else 4173 and 4174. */
export function localPorts(root?: string): { preview: number; docsPreview: number };
/** The app whose strings a docs folder uses: the folder above docs/, or the workspace's app. */
export function docsApp(docsRoot: string): string;
/** What names a build's commit: part of the build's cache key. */
export declare const stampEnv: string[];
/** The workspace root above `root`, if it is in one. */
export function workspaceOf(root: string): string | undefined;
/** The platform package's generate task by name, when the workspace holds the package. */
export function platformGenerate(workspace: string): string[];
/** What a person runs, by its Vite Plus name, with what it does (COMMANDS.md's first table). */
export function frontDoor(remy?: string): [string, string][];
