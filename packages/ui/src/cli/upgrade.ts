// `remy upgrade <version>` (an app, not remy-auth): move to one shared release. The package at that
// exact version, the shared CI workflow at its tag, then the skills of that release, the agents' rules
// block, the guard, and the installation's checks.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  installSkills();
  rules();
  await register(false);
  guard([]);
  await verifySetup();
  console.log(`upgrade: on @joeblew999/remy-ui ${version}.`);
}

export const what =
  "<version>: this app onto a release of the platform: the package, the workflow's tag, the skills, the rules, the guard, the installation's checks (vp run upgrade)";
export const main = (args: string[]): Promise<void> => upgrade(args[0]);
