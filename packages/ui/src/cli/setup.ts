// `remy setup` (npm run setup): install dependencies, the pinned skills, the agents' rules block, MCP
// registration and the flow's guard, then the installation's checks and the check. About two minutes,
// no browser: the browser suite is GitHub's after every landing, and the release's.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { main as guard } from './register.ts';
import { installPrePush } from './ci.ts';
import { register } from './mcp.ts';
import { rules } from './rules.ts';
import { installSkills } from './skills.ts';
import { verifySetup } from './verify.ts';

/** What setup needs before it can start, each with where to go. */
export function preconditions(): void {
  const recipe = 'docs/content/dev/tasks.md, "A new consumer" (https://remy-auth-docs.gedw99.workers.dev/dev/tasks#a-new-consumer)';
  const problems: string[] = [];
  if (spawnSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' }).status !== 0) problems.push('not a git repository: run git init (the translation and plans tools read git history)');
  if (!existsSync('package.json')) problems.push(`no package.json: start from the blank app (${recipe})`);
  else if (!existsSync('package-lock.json')) problems.push('no package-lock.json: run npm install once and commit it (setup runs npm ci, which needs it)');
  if (!existsSync('wrangler.jsonc')) problems.push(`no wrangler.jsonc: the Worker's name and bindings; the blank app has one (${recipe})`);
  if (problems.length) { console.error(`setup cannot start here:\n${problems.map(problem => `  - ${problem}`).join('\n')}`); process.exit(1); }
}

/** GitHub Packages' token (the shared UI): the shell's, else gh's login. */
function githubToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined; } catch { return undefined; }
}

export async function setup(): Promise<void> {
  preconditions();
  const token = githubToken();
  const install = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { stdio: 'inherit', env: { ...process.env, ...(token ? { GITHUB_TOKEN: token } : {}) } });
  if (install.status !== 0) { console.error('setup: npm ci failed'); process.exit(install.status ?? 1); }
  installSkills();
  rules();
  await register(false);
  guard([]);
  installPrePush();
  await verifySetup();
}

export const what = "npm ci, the pinned skills, the agents' rules, MCP registration, the guard, the pre-push hook (npm run ci), then the installation's checks (npm run setup); preconditions: those alone";
export async function main(args: string[]): Promise<void> {
  if (args[0] === 'preconditions') return preconditions();
  return setup();
}
