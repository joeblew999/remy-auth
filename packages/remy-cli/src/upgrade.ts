// `remy upgrade <version>` (an app, not remy-auth): move to one shared release. The package at that
// exact version, the shared CI workflow at its tag, the flow's scripts and Vite Plus's Git hooks as that release
// has them, then the skills of that release, the agents' rules block, and the installation's checks.
// One command, not a script of steps: `vp run upgrade <version>` hands the version to a script's last command only,
// and the install that needs it comes first.
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
import { register } from './mcp.ts';
import { rules } from './rules.ts';
import { installSkills } from './skills.ts';
import { verifySetup } from './verify.ts';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export async function upgrade(version: string | undefined): Promise<void> {
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    fail('remy upgrade <version>: a released version without the v, e.g. 0.15.0');
  if (existsSync('packages/remy-cli/src/remy.ts'))
    fail('upgrade: this is remy-auth, which owns the package; an app upgrades.');
  const token =
    process.env.GITHUB_TOKEN ||
    (() => {
      try {
        return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch {
        return '';
      }
    })();
  const blank = fetchBlank(version);
  // The platform and its command line, released together under the same number.
  const install = spawnSync(
    'vp',
    ['add', '--save-exact', `@joeblew999/remy-ui@${version}`, `@joeblew999/remy-cli@${version}`],
    {
      stdio: 'inherit',
      env: { ...process.env, ...(token ? { GITHUB_TOKEN: token } : {}) },
    },
  );
  if (install.status !== 0) fail('upgrade: vp add failed');
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
  rmSync(blank, { recursive: true, force: true });
  installSkills();
  rules();
  await register(false);
  await verifySetup();
  console.log(`upgrade: on @joeblew999/remy-ui ${version}.`);
}

/** remy-auth's blank app (template/) at a release's tag, in a scratch folder. */
function fetchBlank(version: string): string {
  const blank = mkdtempSync(join(tmpdir(), 'remy-blank-'));
  const got = spawnSync(
    'pnpm',
    ['dlx', 'giget@3.3.1', `gh:joeblew999/remy-auth/template#v${version}`, blank, '--force'],
    {
      stdio: 'inherit',
    },
  );
  if (got.status !== 0) fail(`upgrade: the blank app at v${version} could not be fetched`);
  return blank;
}

/**
 * The blank app (remy-auth's template/) at the release's tag, the one source of what every app's flow is: its
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
  // remy.config.ts: its type is the command line's now, and the ports are the tasks' own (PREVIEW_PORT, 4173).
  if (existsSync('remy.config.ts')) {
    const before = readFileSync('remy.config.ts', 'utf8');
    const after = before
      .replace("'@joeblew999/remy-ui/project'", "'@joeblew999/remy-cli/project'")
      .replace(/^\s*ports: \{[^}]*\},?\n/m, '');
    if (after !== before) {
      writeFileSync('remy.config.ts', after);
      console.log('upgrade: remy.config.ts takes its type from @joeblew999/remy-cli/project, without ports');
    }
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
  "<version>: this app onto a release of the platform: the package, the workflow's tag, the scripts, hooks and configuration of the blank app, the skills, the rules, the installation's checks (vp run upgrade)";
export const main = (args: string[]): Promise<void> => upgrade(args[0]);
