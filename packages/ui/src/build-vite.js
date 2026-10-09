// What a build is, worked out once when Vite starts and read by both sides of it (remy-sport's build
// stamp, for every app): the Worker answers with it at /healthz, and the page carries it, so an open
// page can tell when the deployment has moved on (build-stamp.tsx). Everything in it comes from the
// sources: the same checkout builds the same stamp, so a bundle's hash moves only when its code does.
// There is no build time in it for that reason; when a version was deployed is Cloudflare's to say.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const id = 'virtual:remy-build';

const git = (root, ...args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 }).trim();
  } catch {
    return ''; // not a git checkout (a tarball, some CI): the stamp says so by naming no commit
  }
};

/** The version of `name` as installed for the app at `root`: the nearest node_modules that has it. */
function installedVersion(name, root) {
  for (let directory = root; ; directory = dirname(directory)) {
    const file = resolve(directory, 'node_modules', name, 'package.json');
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).version;
    if (dirname(directory) === directory) return undefined;
  }
}

/**
 * The stamp of the app at `root`: its package's name and version, the commit it was built from,
 * `changes` (empty for a clean checkout, else a short hash of what was uncommitted, so two builds of
 * one commit with different edits differ), and the installed version of each package in `packages`
 * and of every dependency the app's package.json names in the platform's scope.
 */
export function buildStamp({ root = process.cwd(), packages = [], scope = '@joeblew999/' } = {}) {
  const app = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const commit = git(root, 'rev-parse', 'HEAD');
  const uncommitted = commit ? git(root, 'status', '--porcelain') : '';
  const changes = uncommitted ? createHash('sha256').update(uncommitted).update(git(root, 'diff', 'HEAD')).digest('hex').slice(0, 7) : '';
  const named = [...Object.keys({ ...app.dependencies, ...app.devDependencies }).filter(name => name.startsWith(scope)), ...packages];
  const versions = Object.fromEntries([...new Set(named)].sort().flatMap(name => {
    const version = installedVersion(name, root);
    return version ? [[name, version]] : [];
  }));
  return { app: { name: app.name ?? '', version: app.version ?? '' }, commit, changes, packages: versions };
}

/**
 * The Vite plugin: `virtual:remy-build` exports `build`, the stamp above. remyApp() and remyDocs()
 * include it, so an app writes nothing; `packages` names more packages whose versions the stamp lists.
 */
export function remyBuild(options = {}) {
  let stamp;
  return {
    name: 'remy-build',
    resolveId: source => source === id ? `\0${id}` : undefined,
    load: loaded => loaded === `\0${id}` ? `export const build = ${JSON.stringify(stamp ??= buildStamp(options))};` : undefined,
  };
}
