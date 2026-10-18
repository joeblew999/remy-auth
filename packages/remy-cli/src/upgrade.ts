// `remy upgrade <version>` (an app, not remy-auth): move to one shared release. The package at that
// exact version, the shared CI workflow at its tag, the flow's scripts and Vite Plus's Git hooks as that release
// has them; then vp run setup, that release's setup script (the skills, the agents' rules block, every check).
// One command, not a script of steps: `vp run upgrade <version>` hands the version to a script's last command only,
// and the install that needs it comes first.
//
// Two phases, so an upgrade is always done by the release it moves to (issue #44, as Angular's ng update does): the
// command line the app has installed only installs the release's remy-ui and remy-cli, then hands over to the
// newly installed `remy upgrade <version> --installed`, which does the rest with that release's own code. Without
// it, a change to what the upgrade does reached apps one release late (0.17.0's moved blank app broke 0.16.0's).
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/**
 * GitHub Packages' token: GITHUB_TOKEN (or NODE_AUTH_TOKEN) when set, else gh's when gh is installed and signed in;
 * one sentence, not a stack trace, when there is neither.
 */
function packagesToken(): string {
  const set = process.env.GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN;
  if (set) return set;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fail(
      'upgrade: GitHub Packages needs a token: set GITHUB_TOKEN to one with read:packages, or install gh and run gh auth login',
    );
  }
}

/** The version of remy-cli this app has installed, or nothing. */
function installedCli(): string | undefined {
  const manifest = join('node_modules', '@joeblew999', 'remy-cli', 'package.json');
  return existsSync(manifest) ? (JSON.parse(readFileSync(manifest, 'utf8')) as { version: string }).version : undefined;
}

export function upgrade(version: string | undefined, installed = false): void {
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    fail('remy upgrade <version>: a released version without the v, e.g. 0.15.0');
  if (existsSync('packages/remy-cli/src/remy.ts'))
    fail('upgrade: this is remy-auth, which owns the package; an app upgrades.');
  const token = packagesToken();
  if (!installed) {
    // GitHub Packages' token where pnpm reads it: this machine's pnpm configuration (pnpm expands no variable in a
    // repository's .npmrc).
    spawnSync('vp', ['pm', 'config', 'set', '--location', 'global', '//npm.pkg.github.com/:_authToken', token], {
      stdio: 'ignore',
    });
    // The platform and its command line, released together under the same number.
    const install = spawnSync(
      'vp',
      ['add', '--save-exact', `@joeblew999/remy-ui@${version}`, `@joeblew999/remy-cli@${version}`],
      { stdio: 'inherit', env: { ...process.env, GITHUB_TOKEN: token } },
    );
    if (install.status !== 0) fail('upgrade: vp add failed');
    // The rest by the release's own command line, just installed.
    const rest = spawnSync('vp', ['exec', 'remy', 'upgrade', version, '--installed'], {
      stdio: 'inherit',
      env: { ...process.env, GITHUB_TOKEN: token },
    });
    process.exit(rest.status ?? 1);
  }
  if (installedCli() !== version)
    fail(
      `upgrade: the installed remy-cli is ${installedCli() ?? 'missing'}, not ${version}: run remy upgrade ${version}`,
    );
  const blank = fetchBlank(version, token);
  // Vite Plus at the release's version, the way its docs say (guide/upgrade-project.md): that version's migrator
  // re-pins vite-plus, the vite alias and the vitest pin together, in every workspace package.
  const vitePlus = /^\s*vite-plus:\s*['"]?([^'"\s]+)/m.exec(
    readFileSync(join(blank, 'pnpm-workspace.yaml'), 'utf8'),
  )?.[1];
  if (vitePlus) {
    // Exactly as Vite Plus's guide runs a target migrator (migrate.md, "Without the Global CLI"): the package named,
    // since it ships two commands (vp, vpr), and no questions asked.
    const migrate = spawnSync('vp', ['dlx', `--package=vite-plus@${vitePlus}`, 'vp', 'migrate', '--no-interactive'], {
      stdio: 'inherit',
    });
    if (migrate.status !== 0) fail(`upgrade: vite-plus@${vitePlus} migrate failed`);
  }
  // The shared CI workflow at the same tag, when the app calls it.
  const retag = (file: string, pattern: RegExp) => {
    const text = readFileSync(file, 'utf8');
    const next = text.replace(pattern, `$1v${version}`);
    if (next !== text) {
      writeFileSync(file, next);
      console.log(`upgrade: ${file} at v${version}`);
    }
  };
  if (existsSync('.github/workflows'))
    for (const name of readdirSync('.github/workflows').filter((name) => /\.ya?ml$/.test(name))) {
      retag(`.github/workflows/${name}`, /(joeblew999\/remy-auth\/\.github\/workflows\/[a-z-]+\.yml@)v\d+\.\d+\.\d+/g);
      // The shared workflow is ci.yml from the release after 0.15.1 (google.yml until then, which older tags keep).
      const after = (v: string) => {
        const [a = 0, b = 0, c = 0] = v.split('.').map(Number);
        return a * 1e6 + b * 1e3 + c > 15_001;
      };
      if (after(version)) {
        const file = `.github/workflows/${name}`;
        writeFileSync(
          file,
          readFileSync(file, 'utf8').replace(
            'remy-auth/.github/workflows/google.yml@',
            'remy-auth/.github/workflows/ci.yml@',
          ),
        );
      }
    }
  scriptsAndHooks(blank, version);
  console.log(`upgrade: on @joeblew999/remy-ui ${version}. Next: vp run setup (the skills, the rules, every check).`);
}

/** The registry the app's own .npmrc names for our scope, else GitHub Packages. */
function scopeRegistry(): string {
  const npmrc = existsSync('.npmrc') ? readFileSync('.npmrc', 'utf8') : '';
  return (/^@joeblew999:registry\s*=\s*(\S+)\s*$/m.exec(npmrc)?.[1] ?? 'https://npm.pkg.github.com').replace(
    /\/+$/,
    '',
  );
}

/**
 * The blank app at a release, in a scratch folder removed when the upgrade ends, however it ends:
 * `vp create @joeblew999:app@<version>`, from @joeblew999/create, as a new app is made. vp create reads a registry's
 * address and token from .npmrc files (its guide: the project's and ~/), not pnpm's own configuration, so the scratch
 * folder gets one, private to this user: the app's own registry for the scope, and the token for its host. (Not
 * npm_config_ variables: on GitHub's runner they did not reach vp create, which asked npmjs.org; issue #44.)
 * VP_SKIP_INSTALL: vp create installs the new app's dependencies itself, which the upgrade never needs; Vite Plus's
 * own switch for that, read in vite-plus/dist/prompts-*.js (runViteInstall), not in its docs: if a Vite Plus upgrade
 * drops it, the scratch app is installed again (slow, harmless).
 */
function fetchBlank(version: string, token: string): string {
  const scratch = mkdtempSync(join(tmpdir(), 'remy-blank-'));
  process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));
  const registry = scopeRegistry();
  writeFileSync(
    join(scratch, '.npmrc'),
    `@joeblew999:registry=${registry}/\n${registry.replace(/^https?:/, '')}/:_authToken=${token}\n`,
    { mode: 0o600 },
  );
  const got = spawnSync(
    'vp',
    [
      'create',
      `@joeblew999:app@${version}`,
      '--directory',
      'app',
      '--no-interactive',
      '--no-git',
      '--no-agent',
      '--no-editor',
      '--no-hooks',
    ],
    { cwd: scratch, stdio: 'inherit', env: { ...process.env, VP_SKIP_INSTALL: '1' } },
  );
  if (got.status !== 0)
    fail(`upgrade: the blank app at ${version} could not be made (vp create @joeblew999:app@${version})`);
  return join(scratch, 'app');
}

/**
 * The blank app (@joeblew999/create's templates/app) at the release, the one source of what every app's flow is: its
 * package.json scripts in place of the app's flow scripts (the app's own kept), its Git hooks, and its two
 * vite.config.ts files, whose tasks are written out, when the app's still has none of its own (an app from before
 * the tasks were). Nothing is generated: the files are copied as the release has them.
 */
export function scriptsAndHooks(blank: string, version: string): void {
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as { scripts?: Record<string, string> };
  const theirs = read(join(blank, 'package.json')).scripts ?? {};
  const manifest = read('package.json');
  const own = Object.fromEntries(
    Object.entries(manifest.scripts ?? {}).filter(
      ([name]) => !(name in theirs) && !/^(dev:[a-z]+|check|release-checks)$/.test(name),
    ),
  );
  manifest.scripts = { ...own, ...theirs };
  writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`upgrade: package.json's flow scripts are the blank app's at v${version}`);
  mkdirSync('.vite-hooks', { recursive: true });
  for (const name of readdirSync(join(blank, '.vite-hooks')).filter((name) => name !== '_')) {
    cpSync(join(blank, '.vite-hooks', name), join('.vite-hooks', name));
    chmodSync(join('.vite-hooks', name), 0o755);
  }
  for (const config of ['vite.config.ts', join('docs', 'vite.config.ts')]) {
    if (!existsSync(join(blank, config)) || (existsSync(config) && readFileSync(config, 'utf8').includes('run:')))
      continue;
    if (existsSync(config)) cpSync(config, `${config}.before-upgrade`);
    cpSync(join(blank, config), config);
    console.log(
      `upgrade: ${config} is the blank app's, with its tasks written out (yours is ${config}.before-upgrade: move any plugins or options you added)`,
    );
  }
  // The files every app has now, the blank app's when the app has none: pnpm's workspace (its catalog), the docs'
  // Fumadocs collections and the docs Worker's own Wrangler configuration.
  for (const file of ['pnpm-workspace.yaml', join('docs', 'collections.ts'), join('docs', 'wrangler.jsonc')])
    if (existsSync(join(blank, file)) && !existsSync(file) && (file === 'pnpm-workspace.yaml' || existsSync('docs'))) {
      cpSync(join(blank, file), file);
      console.log(`upgrade: ${file} is the blank app's (check its names: the Worker's, the catalog's versions)`);
    }
  // Where the app is deployed is its .env now (Vite's file): the blank app's when the app has none, with remy.config.ts's
  // origins written in.
  if (!existsSync('.env') && existsSync(join(blank, '.env'))) {
    let text = readFileSync(join(blank, '.env'), 'utf8');
    const old = existsSync('remy.config.ts') ? readFileSync('remy.config.ts', 'utf8') : '';
    const production = /production:\s*'([^']+)'/.exec(old)?.[1];
    const docs = /docs:\s*'([^']+)'/.exec(old)?.[1];
    if (production) text = text.replace(/^VITE_DEPLOY_ORIGIN=.*$/m, `VITE_DEPLOY_ORIGIN=${production}`);
    if (docs) text = text.replace(/^VITE_DOCS_ORIGIN=.*$/m, `VITE_DOCS_ORIGIN=${docs}`);
    writeFileSync('.env', text);
    console.log("upgrade: .env says where the app and its docs are deployed (from remy.config.ts's origins)");
  }
  // remy.config.ts is read by nothing now: the origins are in .env, and releases are Changesets'.
  if (existsSync('remy.config.ts')) {
    rmSync('remy.config.ts');
    console.log('upgrade: remy.config.ts removed (its origins are in .env)');
  }
  const ignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
  if (!ignore.includes('.vite-hooks/_/'))
    writeFileSync(
      '.gitignore',
      `${ignore.replace(/\n?$/, '\n')}# Vite Plus's Git hook dispatcher, written by vp config (the prepare script).\n.vite-hooks/_/\n`,
    );
  // Vite Plus's own rules for agents, from the installed package, beside the app's.
  const vitePlusRules = '@node_modules/vite-plus/AGENTS.md';
  if (existsSync('CLAUDE.md') && !readFileSync('CLAUDE.md', 'utf8').includes(vitePlusRules))
    writeFileSync('CLAUDE.md', `${readFileSync('CLAUDE.md', 'utf8').replace(/\n?$/, '\n')}${vitePlusRules}\n`);
  console.log(
    "upgrade: the flow is vp run (COMMANDS.md); Cloudflare's build command for this app is: pnpm vp run build",
  );
}

export const what =
  "<version>: this app onto a release of the platform: the package, the workflow's tag, the scripts, hooks and configuration of the blank app, then vp run setup (vp run upgrade)";
export const main = (args: string[]): void => upgrade(args[0], args.includes('--installed'));
