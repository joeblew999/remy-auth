// `remy ci` (npm run ci): what GitHub runs, by the same command on a developer's Mac, in a cloud agent's
// container and on GitHub (owner, 2026-10-17: "the whole point is that we can run it locally and there").
// Each GitHub job is `npm run ci -- <part>` and nothing else, so the workflow cannot drift from what a
// person or an agent runs. Locally, `npm run ci` runs every part in turn and ends with what each took.
//
// It owns its preconditions instead of leaving them to the machine: Playwright's pinned Chromium (the
// browser every check uses), and on Linux a Han font, without which Japanese and Chinese are empty boxes. It skips what a change
// cannot affect exactly as on a pull request (unchanged.ts): against origin/main on a branch, nothing
// skipped on main itself or with --everything.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lap, lastRecord } from './timing.ts';

// The four parts, one name each everywhere (this list, GitHub's job names, the logs, COMMANDS.md): `check` (dev:change's
// check, whole, verifying instead of fixing), `browser` (the browser checks on a local build), `audits` (Google's Lighthouse) and `new-app`
// (a brand-new app on this commit's package). What a run includes is decided by what its change can affect
// (unchanged.ts), so there are no levels to choose (owner, 2026-10-17: levels were a second vocabulary for these).
type Part = 'check' | 'browser' | 'audits' | 'new-app';
const parts: Part[] = ['check', 'browser', 'audits', 'new-app'];
/**
 * One rule, on a pull request and here alike: every part runs when what changed can affect it (unchanged.ts
 * decides, and each part says when it skips). Until 2026-10-17 the audits and the new app ran only after merge, a
 * second tier the change rules made needless (owner: "because we have changes now, maybe you don't need different
 * levels of CI"); now a change to the package meets the new app before it merges. Main runs everything, nothing
 * skipped, as the safety net dev:promote waits for; `npm run ci -- --everything` runs that here.
 */
/** GitHub splits the browser part across this many jobs. */
export const shards = 3;
/** The jobs GitHub's workflow must run, one `npm run ci -- <part>` each (tests/unit/ci.unit.spec.ts holds the workflow to it). */
export const jobParts = (): string[] => [
  'check',
  ...Array.from({ length: shards }, (_, i) => `browser --shard ${i + 1}/${shards}`),
  'audits',
  'new-app',
];
const browserParts: Part[] = ['browser', 'audits', 'new-app'];

const fail = (message: string): never => {
  console.error(`ci: ${message}`);
  process.exit(1);
};
const onGitHub = process.env.GITHUB_ACTIONS === 'true';
const root = process.getuid?.() === 0;

/** Runs a command, inheriting output; exits with its status when it fails. */
function run(command: string, args: string[], env: Record<string, string> = {}): void {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const quiet = (command: string, args: string[]) => spawnSync(command, args, { encoding: 'utf8' });

/** Playwright's own Chromium, at the version @playwright/test pins; installed when this machine lacks it. */
async function browser(): Promise<void> {
  const require = createRequire(join(process.cwd(), 'package.json'));
  const loaded = (await import(
    pathToFileURL(require.resolve('@playwright/test')).href
  )) as typeof import('@playwright/test') & { default?: typeof import('@playwright/test') };
  const chromium = loaded.chromium ?? loaded.default!.chromium;
  if (existsSync(chromium.executablePath())) return;
  console.log("ci: installing Playwright's Chromium (once per Playwright version)");
  run(join(process.cwd(), 'node_modules', '.bin', 'playwright'), ['install', 'chromium']);
}

/**
 * On Linux the Han languages are drawn by system fonts (fonts.css ships none for them), so a machine
 * without a Han font draws empty boxes, which the font checks rightly refuse. GitHub's runners have none:
 * Noto CJK is installed where this process may (root, or sudo without a password); anywhere else ci stops
 * with the fix before a browser starts. Which Han face a machine then picks is its own business (the font
 * checks test what the app controls: each page's language, and no shared web font).
 */
export function fonts(): void {
  if (process.platform !== 'linux') return;
  if (/Noto Sans CJK/.test(quiet('fc-list', [':', 'family']).stdout ?? '')) return;
  const sudo = root ? [] : quiet('sudo', ['-n', 'true']).status === 0 ? ['sudo', '-n'] : undefined;
  if (!sudo) fail('the font checks need a Han font on Linux: install the package fonts-noto-cjk, then run again.');
  console.log('ci: installing Noto CJK (fonts-noto-cjk): Japanese and Chinese have no other font on this machine');
  const [command, ...rest] = [...sudo!, 'apt-get', 'install', '-y', '--no-install-recommends', 'fonts-noto-cjk'];
  run(command!, rest, { DEBIAN_FRONTEND: 'noninteractive' });
}

/**
 * The Node the repository pins (.node-version), which GitHub's jobs use (setup-node reads it): on any other
 * Node the same checks give another answer (2026-10-17: a container on Node 22 failed on an Intl API of
 * Node 26's, after 30 seconds and with nothing saying why). ci stops first, naming both.
 */
function node(): void {
  if (!existsSync('.node-version')) return;
  const pinned = readFileSync('.node-version', 'utf8').trim().replace(/^v/, '');
  if (process.versions.node !== pinned)
    fail(
      `this is Node ${process.versions.node}; the repository pins ${pinned} (.node-version), which GitHub uses. Run with Node ${pinned} (install it from https://nodejs.org/dist/v${pinned}/), then run again.`,
    );
}

/**
 * Locally, compare against origin/main as a pull request would, so `npm run ci` on a branch skips what
 * GitHub would skip; on main, or with --everything, nothing is skipped. On GitHub the workflow's event decides.
 */
function changesBase(everything: boolean): void {
  if (onGitHub || everything || process.env.REMY_CHANGES_BASE) return;
  const branch = quiet('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout?.trim();
  if (!branch || branch === 'main' || branch === 'HEAD') return;
  if (quiet('git', ['rev-parse', '--verify', '--quiet', 'origin/main']).status !== 0) return;
  process.env.REMY_CHANGES_BASE = 'origin/main';
  console.log('ci: comparing with origin/main, as a pull request would (--everything runs all of it)');
}

const npm = (...args: string[]) => run('npm', ['run', ...args]);

/** Each part runs here, in this process; REMY_FLOW says the run is CI's, so the gate lets it pass. */
async function runPart(part: Part, shardOf?: string): Promise<void> {
  process.env.REMY_FLOW = process.env.REMY_FLOW ?? 'ci';
  // The check is dev:change's, whole (owner, 2026-10-17: one meaning of "check"); under ci it verifies instead of fixing.
  if (part === 'check') {
    npm('check');
    return;
  }
  if (part === 'browser' && shardOf) process.env.REMY_SHARD = shardOf;
  const test = await import('./test.ts');
  if (part === 'browser') test.every();
  else if (part === 'audits') await test.google();
  else test.consumers();
}

/**
 * The git pre-push hook `npm run setup` installs: a push runs `npm run ci` first, so what reaches GitHub
 * (and Cloudflare's preview build) already passed here. The flow's own steps (dev:land, dev:release),
 * which set REMY_FLOW and run their checks themselves, push without it; REMY_SKIP_CI=1 skips it on purpose.
 */
export function installPrePush(): void {
  const common = quiet('git', ['rev-parse', '--git-common-dir']).stdout?.trim();
  if (!common) return;
  const hooks = join(common, 'hooks');
  mkdirSync(hooks, { recursive: true });
  const file = join(hooks, 'pre-push');
  writeFileSync(
    file,
    '#!/bin/sh\n# Installed by npm run setup (remy ci): a push runs what its pull request will, first.\n[ -n "$REMY_FLOW" ] || [ -n "$REMY_SKIP_CI" ] && exit 0\nexec npm run --silent ci\n',
    { mode: 0o755 },
  );
  console.log(`ci: ${file} runs npm run ci before every push (REMY_SKIP_CI=1 to skip once).`);
}

export async function ci(args: string[]): Promise<void> {
  let everything = false,
    shardOf: string | undefined;
  const asked: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--last') {
      console.log(lastRecord('ci'));
      return;
    } else if (args[i] === '--everything') everything = true;
    else if (args[i] === '--full' || args[i] === '--all')
      fail(
        `${args[i]} is gone: npm run ci runs what this change can affect; npm run ci -- --everything runs all of it, as main does.`,
      );
    else if (args[i] === '--shard') shardOf = args[++i] ?? '';
    else asked.push(args[i]!);
  }
  if (shardOf !== undefined && !/^\d+\/\d+$/.test(shardOf)) fail(`--shard takes <i>/<n>, got ${shardOf}`);
  const chosen = (asked.length ? asked : parts) as Part[];
  for (const part of chosen) if (!parts.includes(part)) fail(`unknown part ${part}: ${parts.join(', ')}`);
  if (shardOf && (chosen.length !== 1 || chosen[0] !== 'browser'))
    fail('--shard splits the browser part only: npm run ci -- browser --shard 1/3');

  // Run as on GitHub: tools that read CI behave alike (Playwright, for one, uses every core under it).
  process.env.CI = process.env.CI ?? '1';
  node();
  changesBase(everything);
  if (chosen.some((part) => browserParts.includes(part))) {
    await browser();
    fonts();
    lap('browser and fonts');
  }
  // The CLI times the run and records it (timing.ts); each part is a lap, and what a part runs records itself under it.
  for (const part of chosen) {
    console.log(`\nci: ${part}${shardOf ? ` (shard ${shardOf})` : ''}`);
    await runPart(part, shardOf);
    lap(shardOf ? `${part} ${shardOf}` : part);
  }
  if (!onGitHub && !asked.length && !everything)
    console.log(
      'ci: what a pull request runs: every part this change can affect. Main runs all of it: npm run ci -- --everything.',
    );
}

export const what =
  '[check|browser|audits|new-app] [--shard i/n] [--everything] [--last]: what GitHub runs, the same here: no part runs every part this change can affect, as a pull request does; --everything runs all of it in every language, nothing skipped, as main does';
export const main = (args: string[]): Promise<void> => ci(args);
