import type { Plugin } from 'vite';
import type { Build } from './build';

export type BuildOptions = {
  /** The app's root (default the working directory): its package.json. */
  root?: string;
  /** More packages whose installed versions the stamp lists, beside the app's dependencies in `scope`. */
  packages?: readonly string[];
  /** The platform's package scope (default "@joeblew999/"): the app's dependencies in it are always listed. */
  scope?: string;
};

/** The stamp of the app at `root`: its versions, and the commit a deploy gives it (REMY_COMMIT, WORKERS_CI_COMMIT_SHA). */
export declare function buildStamp(options?: BuildOptions): Build;
/** What a deploy hands its build: the checkout's commit and a hash of what was uncommitted (git, outside the build). */
export declare function gitStamp(root?: string): { REMY_COMMIT: string; REMY_CHANGES: string };
/** The Vite plugin behind `virtual:remy-build`; remyApp() and remyDocs() include it. */
export declare function remyBuild(options?: BuildOptions): Plugin;
