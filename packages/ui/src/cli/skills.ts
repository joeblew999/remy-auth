// Pinned official agent skills for Codex and Claude (`remy skills install|list|remove`). The pins
// here are the only list of skill sources; the tooling check (verify.ts) rejects skills installed from
// anything else. The platform's own `remy` skill comes from the installed package, which its version
// pins (generated from the developer docs by the app's generate step).
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export const skillsCli = 'skills@1.7.0';

/** Each source at a commit, and which of its skills to take ('*' for all). */
export const pins: { source: string; skills: string[] }[] = [
  { source: 'https://github.com/better-auth/skills/tree/20c9e88a5c007461a703f1c213572b073196113e', skills: ['*'] },
  { source: 'https://github.com/cloudflare/skills/tree/6dc7604903127485e7e4cb26314651ebd4a4df19', skills: ['*'] },
  { source: 'https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/6a7e51fecaaefbea46b89e68892d42c175ee9163', skills: ['*'] },
  { source: 'https://github.com/GoogleChrome/modern-web-guidance/tree/22ab18dfb50a5d7e3bdcf471c14076a5534eae4e', skills: ['modern-web-guidance'] },
  { source: 'https://github.com/shadcn-ui/ui/tree/98a1fe67b439324ddc857f47fbdce056600a4329', skills: ['shadcn'] },
  { source: 'https://github.com/microsoft/playwright-cli/tree/74354ecc7a43da16d91a9bc54fa8db8283a3fcf5', skills: ['playwright-cli'] },
  { source: 'https://github.com/github/awesome-copilot/tree/1f5644080a525d26a2e24f61a7609fb9b261c21a', skills: ['github-release'] },
  { source: 'https://github.com/TanStack/router/tree/ddad69a4a4b18c19e3fcc510ac1e21f9dab883a7', skills: ['react-start', 'react-router', 'start-core', 'start-server-core', 'router-core', 'router-plugin', 'router-query', 'navigation', 'path-params', 'search-params', 'data-loading', 'code-splitting', 'not-found-and-errors', 'auth-and-guards', 'auth-server-primitives', 'server-functions', 'server-routes', 'middleware', 'execution-model', 'ssr', 'deployment', 'type-safety', 'migrate-from-react-router'] },
];

/** Where the installed package's own skill sits. */
export const remySkillPath = './node_modules/@joeblew999/remy-ui/skills';

const agents = ['--agent', 'codex', 'claude-code'];

function skillsTool(args: string[]): void {
  const result = spawnSync('npx', ['--yes', skillsCli, ...args], { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`skills: npx ${skillsCli} ${args.join(' ')} failed`); process.exit(result.status ?? 1); }
}

/** Install every pinned source for both agents, then the platform's own skill from the installed package. */
export function installSkills(): void {
  for (const pin of pins) skillsTool(['add', pin.source, ...pin.skills.flatMap(skill => ['--skill', skill]), ...agents, '--full-depth', '--yes']);
  if (existsSync(`${remySkillPath}/remy/SKILL.md`)) skillsTool(['add', remySkillPath, '--skill', 'remy', ...agents, '--yes']);
  else console.log('skills: no remy skill in the installed package (it comes with a release of @joeblew999/remy-ui); the pinned ones are installed.');
}

export const listSkills = (): void => skillsTool(['list', ...agents]);
export const removeSkills = (): void => skillsTool(['remove', '--all']);

export function main(args: string[]): void {
  const commands: Record<string, () => void> = { install: installSkills, list: listSkills, remove: removeSkills };
  const run = commands[args[0] ?? ''];
  if (!run) { console.error('remy skills: install | list | remove'); process.exit(2); }
  run();
}
