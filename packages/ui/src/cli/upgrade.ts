// `remy upgrade <version>` (an app, not remy-auth): move to one shared release. The package at that
// exact version, the shared CI workflow at its tag, the flow's scripts and Vite Plus's Git hooks as that release
// has them, then the skills of that release, the agents' rules block, the guard, and the installation's checks.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from './mcp.ts';
import { main as guard } from './register.ts';
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
  if (existsSync('packages/ui/src/cli/remy.ts'))
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
  const install = spawnSync('npm', ['install', '--save-exact', `@joeblew999/remy-ui@${version}`], {
    stdio: 'inherit',
    env: { ...process.env, ...(token ? { GITHUB_TOKEN: token } : {}) },
  });
  if (install.status !== 0) fail('upgrade: npm install failed');
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
  await scriptsAndHooks();
  installSkills();
  rules();
  await register(false);
  guard([]);
  await verifySetup();
  console.log(`upgrade: on @joeblew999/remy-ui ${version}.`);
}

/**
 * The scripts and hooks of the release just installed (its tasks.js, the one source): the flow's scripts in place of
 * an app's old ones (npm run dev:land and the rest), no script that shares a name with a shared task (Vite Plus runs
 * the task), the app's own kept; Vite Plus's hooks in .vite-hooks/, its dispatcher ignored.
 */
export async function scriptsAndHooks(): Promise<void> {
  const tasks = (await import(
    pathToFileURL(join(process.cwd(), 'node_modules', '@joeblew999', 'remy-ui', 'src', 'tasks.js')).href
  )) as typeof import('../tasks.js');
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
  const old =
    /^(dev:[a-z]+|plans|packages|test|docs|observe|shots|api|logs|errors|wrangler|browser(:[a-z]+)?|web|codex(:[a-z]+)?|claude(:[a-z]+)?)$/;
  const shared = new Set(tasks.taskNames());
  const own = Object.fromEntries(
    Object.entries(manifest.scripts ?? {}).filter(([name]) => !old.test(name) && !shared.has(name)),
  );
  // An app's own release checks keep running: the name is a task now, which the app's vite.config.ts gives them.
  const releaseChecks = manifest.scripts?.['release-checks'];
  if (releaseChecks) {
    own['release-checks:app'] = releaseChecks;
    console.log(
      "upgrade: your release-checks script is now release-checks:app; vp run release runs the release-checks task, so add to vite.config.ts: remyApp({ tasks: { 'release-checks': { command: 'vp run release-checks:app', cache: false } } })",
    );
  }
  const dropped = Object.keys(manifest.scripts ?? {}).filter((name) => !(name in own) && name !== 'release-checks');
  manifest.scripts = { ...own, ...tasks.flowScripts('remy'), upgrade: 'remy upgrade' };
  writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  if (dropped.length) console.log(`upgrade: scripts the tasks replace, removed: ${dropped.join(', ')}`);
  mkdirSync('.vite-hooks', { recursive: true });
  for (const [name, text] of Object.entries(tasks.hookFiles)) {
    writeFileSync(join('.vite-hooks', name), text);
    chmodSync(join('.vite-hooks', name), 0o755);
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
  // The docs' configuration names its own folder: Vite Plus loads it from the repository's root.
  const docsConfig = join('docs', 'vite.config.ts');
  if (existsSync(docsConfig)) {
    const text = readFileSync(docsConfig, 'utf8');
    const next = text.replace(/remyDocs\(docsConfig\)/, 'remyDocs(docsConfig, { root: import.meta.dirname })');
    if (next !== text) {
      writeFileSync(docsConfig, next);
      console.log(`upgrade: ${docsConfig} names its folder (root: import.meta.dirname)`);
    }
  }
  console.log(
    "upgrade: the flow is vp run (COMMANDS.md); Cloudflare's build command for this app is now: npx vp run build",
  );
}

export const what =
  "<version>: this app onto a release of the platform: the package, the workflow's tag, the skills, the rules, the guard, the installation's checks (vp run upgrade)";
export const main = (args: string[]): Promise<void> => upgrade(args[0]);
