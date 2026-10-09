import type { Plugin } from 'vite';
import type { Build } from './build';

export type BuildOptions = {
  /** The app's root (default the working directory): its package.json and its git checkout. */
  root?: string;
  /** More packages whose installed versions the stamp lists, beside the app's dependencies in `scope`. */
  packages?: readonly string[];
  /** The platform's package scope (default "@joeblew999/"): the app's dependencies in it are always listed. */
  scope?: string;
};

/** The stamp of the app at `root`, from its sources: the same checkout builds the same stamp. */
export declare function buildStamp(options?: BuildOptions): Build;
/** The Vite plugin behind `virtual:remy-build`; remyApp() and remyDocs() include it. */
export declare function remyBuild(options?: BuildOptions): Plugin;
