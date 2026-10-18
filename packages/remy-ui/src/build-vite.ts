// What a build is, worked out once when Vite starts and read by both sides of it (remy-sport's build
// stamp, for every app): the Worker answers with it at /healthz, and the page carries it, so an open
// page can tell when the deployment has moved on (build-stamp.tsx). Everything in it comes from the
// sources: the same checkout builds the same stamp, so a bundle's hash moves only when its code does.
// There is no build time in it for that reason; when a version was deployed is Cloudflare's to say.
// The build itself never runs git: Vite Plus counts every file a task reads, a git status reads every changed file in
// the repository and git's index changes with every commit, so a stamp worked out in the build made each change
// anywhere, and each commit, a new build and all the browser checks again (2026-10-17, traced). The commit comes in
// the environment instead: Workers Builds' WORKERS_CI_COMMIT_SHA. A local build names none: Vite Plus's cache is what
// keeps it current.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite-plus';
import type { Build } from './build.ts';

export type BuildOptions = {
  /** The app's root (default the working directory): its package.json. */
  root?: string;
  /** More packages whose installed versions the stamp lists, beside the app's dependencies in `scope`. */
  packages?: readonly string[];
  /** The platform's package scope (default "@joeblew999/"): the app's dependencies in it are always listed. */
  scope?: string;
};

const id = 'virtual:remy-build';

/** The version of `name` as installed for the app at `root`: the nearest node_modules that has it. */
function installedVersion(name: string, root: string): string | undefined {
  for (let directory = root; ; directory = dirname(directory)) {
    const file = resolve(directory, 'node_modules', name, 'package.json');
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).version;
    if (dirname(directory) === directory) return undefined;
  }
}

/**
 * The stamp of the app at `root`: its package's name and version, the commit it was built from, and the installed version of each package in `packages`
 * and of every dependency the app's package.json names in the platform's scope.
 */
export function buildStamp({ root = process.cwd(), packages = [], scope = '@joeblew999/' }: BuildOptions = {}): Build {
  const app = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const commit = process.env.WORKERS_CI_COMMIT_SHA || '';
  const named = [
    ...Object.keys({ ...app.dependencies, ...app.devDependencies }).filter((name: string) => name.startsWith(scope)),
    ...packages,
  ];
  const versions = Object.fromEntries(
    [...new Set(named)]
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .flatMap((name): [string, string][] => {
        const version = installedVersion(name, root);
        return version ? [[name, version]] : [];
      }),
  );
  return { app: { name: app.name ?? '', version: app.version ?? '' }, commit, packages: versions };
}

/**
 * The Vite plugin: `virtual:remy-build` exports `build`, the stamp above. remyApp() and remyDocs()
 * include it, so an app writes nothing; `packages` names more packages whose versions the stamp lists.
 */
export function remyBuild(options: BuildOptions = {}): Plugin {
  let stamp: Build | undefined;
  return {
    name: 'remy-build',
    resolveId: (source: string) => (source === id ? `\0${id}` : undefined),
    load: (loaded: string) =>
      loaded === `\0${id}` ? `export const build = ${JSON.stringify((stamp ??= buildStamp(options)))};` : undefined,
  };
}
