// A repository that publishes packages of its own (npm workspaces that are not private), remy-auth and
// any other Remy repo alike: `remy packages check|upgrade|pack|notes|bumped|publish|tag|release`. The
// workspace list in package.json drives them; remy.config.ts's `release` names the package whose
// version tags a release, and its title. `remy flow release` (STEP 4) is `release` here: every gate, then
// the tag, which publishes.
import { execFileSync, spawnSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translationGaps } from './i18n.ts';
import { cwv, google } from './test.ts';
import { verify, verifySetup } from './verify.ts';

function fail(message: string): never { console.error(message); process.exit(1); }
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const quiet = (command: string, args: string[], env: Record<string, string> = {}) => spawnSync(command, args, { stdio: 'ignore', env: { ...process.env, ...env } }).status === 0;
function tool(command: string, args: string[], options: { env?: Record<string, string>; what?: string } = {}): void {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...options.env } });
  if (result.status !== 0) fail(`${options.what ?? command}: failed`);
}
const bin = (name: string) => join(process.cwd(), 'node_modules', '.bin', name);

export type Workspace = { name: string; version: string; location: string; private?: boolean; publishConfig?: { registry?: string } };

/** Every workspace package.json declares, and the ones that are published (not private), with each one's registry. */
export function workspaces(): { all: Workspace[]; published: (Workspace & { registry: string })[] } {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { workspaces?: string[] };
  const all: Workspace[] = manifest.workspaces?.length ? JSON.parse(execFileSync('npm', ['query', '.workspace'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })) : [];
  return { all, published: all.filter(item => !item.private).map(item => ({ ...item, registry: item.publishConfig?.registry ?? 'https://registry.npmjs.org' })) };
}

/** The lead package (remy.config.ts's release.package): the one whose version names a release. */
function lead(): { name: string; version: string; title: string } {
  const name = process.env.RELEASE_PACKAGE;
  if (!name) fail('release.package is not in remy.config.ts: the package whose version names the release');
  const found = workspaces().published.find(item => item.name === name);
  if (!found) fail(`${name} is not a published workspace here.`);
  return { name, version: found.version, title: process.env.RELEASE_TITLE ?? name };
}

/** npm-check-updates over this repository's own dependencies (the root's and every workspace's); its own workspaces and the platform package are never touched. */
function ncu(...extra: string[]): void {
  const { all } = workspaces();
  const reject = [...new Set(['@joeblew999/remy-ui', ...all.map(item => item.name)])].join(',');
  tool(bin('ncu'), ['--target', 'latest', '--dep', 'prod,dev,optional', ...(all.length ? ['--workspaces', '--root'] : []), '--reject', reject, '--removeRange', ...extra], { what: 'npm-check-updates' });
}

/** Preview the latest versions, changing nothing. */
export const check = (): void => ncu();

/** Move the pins to the latest versions, majors included, install, then the installation's checks. */
export async function upgrade(): Promise<void> {
  ncu('--upgrade');
  tool('npm', ['install', '--prefer-online', '--strict-peer-deps']);
  await verifySetup();
}

const generate = (): void => tool('npm', ['run', '--if-present', '--silent', 'generate'], { what: 'generate' });

/** A tarball of each published package, here, for a scratch app to install before any release. */
export function pack(): void {
  generate();
  const { published } = workspaces();
  if (!published.length) { console.log('pack: this repository publishes no packages (no workspace that is not private).'); return; }
  for (const item of published) tool('npm', ['pack', '--workspace', item.name]);
}

/** CHANGELOG.md's section for a version; fails when it is missing or empty. */
export function notes(version: string): string {
  const text = (() => { try { return readFileSync('CHANGELOG.md', 'utf8'); } catch { return ''; } })();
  const lines = text.split('\n'); const out: string[] = []; let inside = false;
  for (const line of lines) {
    if (line.startsWith(`## [${version}]`)) { inside = true; continue; }
    if (/^## \[/.test(line)) inside = false;
    if (inside) out.push(line);
  }
  const section = out.join('\n');
  if (!section.trim()) fail(`CHANGELOG.md has no notes under "## [${version}]"; write them before releasing.`);
  return `${section.replace(/\n+$/, '')}\n`;
}

/** Every published package whose files changed since the last release tag has a new version (publish skips a version already on the registry, so an unbumped change would never ship). */
export function bumped(): void {
  let last = '';
  try { last = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'); } catch { /* no tag */ }
  if (!last) { console.log('bumped: no release tag yet, nothing to compare.'); return; }
  const problems: string[] = [];
  for (const item of workspaces().published) {
    let then: string | undefined;
    try { then = (JSON.parse(git('show', `${last}:${item.location}/package.json`)) as { version: string }).version; } catch { continue; }
    if (then === item.version && !quiet('git', ['diff', '--quiet', last, '--', item.location])) problems.push(`${item.name} is still ${item.version}, as at ${last}, but ${item.location} changed since: bump its version`);
  }
  if (problems.length) fail(`bumped: ${problems.join('\n')}`);
  console.log(`bumped: every changed package has a new version since ${last}.`);
}

/** Publish each package whose version is not on its registry yet; with a release tag, also create the GitHub release from the changelog. */
export function publish(options: { release?: string; dryRun?: boolean } = {}): void {
  const scratch = mkdtempSync(join(tmpdir(), 'remy-publish-'));
  try {
    let releaseNotes: string | undefined;
    if (options.release) {
      const { name, version } = lead();
      if (options.release !== `v${version}`) fail(`publish: tag ${options.release} is not ${name}'s version v${version}.`);
      releaseNotes = notes(version);
    }
    const token = process.env.NODE_AUTH_TOKEN || (() => { try { return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } })();
    if (!token) fail('publish: no token (NODE_AUTH_TOKEN, or gh auth login)');
    // An app's own .npmrc (the blank app's) reads ${GITHUB_TOKEN} and outranks the user config written below.
    const env = { GITHUB_TOKEN: token, NODE_AUTH_TOKEN: token };
    generate();
    for (const item of workspaces().published) {
      const host = item.registry.replace(/^https:\/\//, '').replace(/\/$/, '');
      const npmrc = join(scratch, 'npmrc');
      writeFileSync(npmrc, `//${host}/:_authToken=${token}\n`);
      const withRc = { ...env, NPM_CONFIG_USERCONFIG: npmrc };
      // As flags, not environment: under an npm run, the child inherits npm_config_userconfig (the user's
      // ~/.npmrc) and loglevel from the parent npm, which beat the environment (2026-10-11: the first
      // release's publish was refused its own token; GitHub's consumer job read a 404 as silence).
      const rc = ['--userconfig', npmrc, '--loglevel=error'];
      // The token npm will publish with is accepted (a registry answers "not found" for a new name whatever the token).
      if (!quiet('npm', ['whoami', ...rc, '--registry', item.registry], withRc)) fail(`publish: ${item.registry} refuses the token npm would publish ${item.name} with (check the app's .npmrc).`);
      // Only "not found" means not published: any other answer stops here, before a publish that would fail the same way after the tag is pushed.
      const view = spawnSync('npm', ['view', `${item.name}@${item.version}`, 'version', ...rc, '--registry', item.registry], { encoding: 'utf8', env: { ...process.env, ...withRc } });
      if (view.status === 0) console.log(`${item.name}@${item.version} is already published.`);
      else if (/E404/.test(`${view.stdout}${view.stderr}`)) tool('npm', ['publish', '--workspace', item.name, '--ignore-scripts', ...rc, ...(options.dryRun ? ['--dry-run'] : [])], { env: withRc });
      else fail(`publish: ${item.registry} did not answer for ${item.name}@${item.version}:\n${view.stdout}${view.stderr}`);
    }
    if (options.release && !options.dryRun) {
      if (quiet('gh', ['release', 'view', options.release])) { console.log(`${options.release} is already released.`); return; }
      const { title } = lead();
      const notesFile = join(scratch, 'notes.md'); writeFileSync(notesFile, releaseNotes!);
      tool('gh', ['release', 'create', options.release, '--title', `${title} ${options.release.slice(1)}`, '--notes-file', notesFile]);
      console.log(`Released ${options.release}.`);
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

/** The release's last step, after the gates: on a clean main that is not behind origin, tag the lead's version, push main and the tag, then publish with the release. */
export function tag(): void {
  const { name, version, title } = lead();
  if (git('branch', '--show-current') !== 'main') fail('Release from main.');
  if (git('status', '--porcelain')) fail('Commit everything before releasing.');
  execFileSync('git', ['fetch', '-q', '--tags', 'origin', 'main']);
  if (!quiet('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'])) fail('main is behind origin/main; pull and re-run the gates.');
  if (quiet('git', ['rev-parse', '-q', '--verify', `refs/tags/v${version}`])) fail(`v${version} is already tagged; bump ${name}'s version.`);
  notes(version);
  bumped();
  execFileSync('git', ['tag', '-a', `v${version}`, '-m', `${title} ${version}`]);
  execFileSync('git', ['push', 'origin', 'main'], { stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', `v${version}`], { stdio: 'inherit' });
  publish({ release: `v${version}` });
}

/**
 * The release: the gates one after another (translations strict, every changed package bumped, the
 * release gate with every check in every language, the app's own release checks, Google's audits
 * locally and Core Web Vitals on a Cloudflare preview), then the tag. About five minutes.
 */
export async function release(): Promise<void> {
  // The release is what runs the gated commands: said first, before the gate asks (2026-10-11, the first
  // release refused itself with the marker set after it).
  process.env.REMY_FLOW ??= 'release';
  if ((await translationGaps()).length) fail('release: translations are incomplete or stale (npx remy i18n check); land, which translates, first.');
  bumped();
  await verify();
  // Not silent: npm would hand loglevel=silent to every nested npm in the script.
  tool('npm', ['run', '--if-present', 'release-checks'], { what: 'release-checks' });
  await google();
  await cwv('release');
  tag();
}

export const what = 'a repository that publishes packages: updates, the pack, the notes, the publish, the tag, the release';
export const commands: Subcommands = {
  check: { what: 'package updates available (npm-check-updates); nothing changed', run: () => check() },
  upgrade: { what: "upgrade every package, major versions included, then the installation's checks", run: () => upgrade() },
  pack: { what: 'pack each published workspace, as the publish would', run: () => pack() },
  notes: { what: "<version>: the CHANGELOG section of a version, as the GitHub release's notes", run: rest => { if (!rest[0]) fail('remy packages notes <version>'); process.stdout.write(notes(rest[0])); } },
  bumped: { what: 'every published package whose files changed since the last release tag has a new version', run: () => bumped() },
  publish: { what: '[--release vX.Y.Z] [--dry-run]: each registry accepts its token, then publish each workspace, then the GitHub release from its notes', run: rest => { const at = rest.indexOf('--release'); return publish({ release: at >= 0 ? rest[at + 1] : undefined, dryRun: rest.includes('--dry-run') }); } },
  tag: { what: "on a clean main: the lead package's version as the tag, pushed with main, then the publish", run: () => tag() },
  release: { what: 'the release: translations strict, bumped, the gate, Google, Core Web Vitals on a preview, the tag (dev:release runs it)', run: () => release() },
};
export const main = dispatch('packages', commands);
