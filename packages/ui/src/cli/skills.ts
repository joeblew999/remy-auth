// Pinned official agent skills for Codex and Claude (`remy skills install|list|remove`). The pins
// here are the only list of skill sources; the tooling check (verify.ts) rejects skills installed from
// anything else. The platform's own `remy` skill comes from the installed package, which its version
// pins (generated from the developer docs by the app's generate step).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dispatch, type Subcommands } from './commands.ts';
import { spawnSync } from 'node:child_process';
import { docsDir } from './config.ts';

export const skillsCli = 'skills@1.7.0';

/** Each source at a commit, and which of its skills to take ('*' for all). */
export const pins: { source: string; skills: string[] }[] = [
  { source: 'https://github.com/better-auth/skills/tree/20c9e88a5c007461a703f1c213572b073196113e', skills: ['*'] },
  { source: 'https://github.com/cloudflare/skills/tree/6dc7604903127485e7e4cb26314651ebd4a4df19', skills: ['*'] },
  {
    source: 'https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/6a7e51fecaaefbea46b89e68892d42c175ee9163',
    skills: ['*'],
  },
  {
    source: 'https://github.com/GoogleChrome/modern-web-guidance/tree/22ab18dfb50a5d7e3bdcf471c14076a5534eae4e',
    skills: ['modern-web-guidance'],
  },
  { source: 'https://github.com/shadcn-ui/ui/tree/98a1fe67b439324ddc857f47fbdce056600a4329', skills: ['shadcn'] },
  {
    source: 'https://github.com/microsoft/playwright-cli/tree/74354ecc7a43da16d91a9bc54fa8db8283a3fcf5',
    skills: ['playwright-cli'],
  },
  {
    source: 'https://github.com/github/awesome-copilot/tree/1f5644080a525d26a2e24f61a7609fb9b261c21a',
    skills: ['github-release'],
  },
  {
    source: 'https://github.com/TanStack/router/tree/ddad69a4a4b18c19e3fcc510ac1e21f9dab883a7',
    skills: [
      'react-start',
      'react-router',
      'start-core',
      'start-server-core',
      'router-core',
      'router-plugin',
      'router-query',
      'navigation',
      'path-params',
      'search-params',
      'data-loading',
      'code-splitting',
      'not-found-and-errors',
      'auth-and-guards',
      'auth-server-primitives',
      'server-functions',
      'server-routes',
      'middleware',
      'execution-model',
      'ssr',
      'deployment',
      'type-safety',
      'migrate-from-react-router',
    ],
  },
];

/** Where the installed package's own skill sits. */
export const remySkillPath = './node_modules/@joeblew999/remy-ui/skills';

const agents = ['--agent', 'codex', 'claude-code'];

function skillsTool(args: string[]): void {
  const result = spawnSync('npx', ['--yes', skillsCli, ...args], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`skills: npx ${skillsCli} ${args.join(' ')} failed`);
    process.exit(result.status ?? 1);
  }
}

/** Install every pinned source for both agents, then the platform's own skill from the installed package. */
export function installSkills(): void {
  for (const pin of pins)
    skillsTool([
      'add',
      pin.source,
      ...pin.skills.flatMap((skill) => ['--skill', skill]),
      ...agents,
      '--full-depth',
      '--yes',
    ]);
  if (existsSync(`${remySkillPath}/remy/SKILL.md`))
    skillsTool(['add', remySkillPath, '--skill', 'remy', ...agents, '--yes']);
  else
    console.log(
      'skills: no remy skill in the installed package (it comes with a release of @joeblew999/remy-ui); the pinned ones are installed.',
    );
}

export const listSkills = (): void => skillsTool(['list', ...agents]);
export const removeSkills = (): void => skillsTool(['remove', '--all']);

export const what = 'the pinned official agent skills for Codex and Claude';
export const commands: Subcommands = {
  install: {
    what: "every pinned skill, and the platform's remy skill from the installed package",
    run: () => installSkills(),
  },
  build: {
    what: 'remy-auth: the remy skill the package ships, from the developer docs as AI tools read them (llms.txt); packing runs it',
    run: () => buildSkill(),
  },
  list: { what: 'the pins and what is installed', run: () => listSkills() },
  remove: { what: 'the installed skills removed', run: () => removeSkills() },
};
export const main = dispatch('skills', commands);

// --- The remy skill, made from the docs as AI tools read them ---------------------------------------------

/**
 * remy-auth only, when the package is packed (never in the quick check): the `remy` skill the package ships,
 * from the developer docs exactly as the docs Worker serves them to AI tools: every page /dev/llms.txt lists,
 * each as /dev/<page>.md (includes resolved, components as text). So the skill, llms.txt, each page's .md and the
 * MCP servers are one text from one source, and a docs page cannot reach one and miss another (2026-10-17: the
 * skill copied 8 hand-picked raw files, so the Commands page's include and every other page never reached
 * other repos' agents). The skill is the rules of this package's version; the live docs have the newest.
 */
export async function buildSkill(): Promise<void> {
  if (!existsSync(join(docsDir() ?? 'docs', 'content/dev')) || !existsSync('packages/ui/package.json')) {
    console.log('skills build: only remy-auth makes the remy skill (from its developer docs).');
    return;
  }
  const { build, serveBuilt } = await import('./docs.ts');
  build();
  const { origin: base, stop } = await serveBuilt();
  const text = async (path: string) => {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error(`skills build: ${path} answered ${response.status}`);
    return response.text();
  };
  try {
    const pages = [
      ...(await text('/dev/llms.txt')).matchAll(
        /^- \[([^\]]+)\]\((?:https?:\/\/[^/)]+)?\/dev(?:\/([^)#\s]+))?\): (.*)$/gm,
      ),
    ].map(([, title, slug, description]) => ({ title: title!, slug: slug ?? 'index', description: description! }));
    if (pages.length < 5) throw new Error(`skills build: /dev/llms.txt lists ${pages.length} pages`);
    const out = join('packages', 'ui', 'skills', 'remy');
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, 'references'), { recursive: true });
    for (const page of pages) {
      // The site's heading ids ("## Title [#id]") are the site's; a page's links to another (./x.md, ./x.mdx) name its file here.
      const body = (await text(`/dev/${page.slug}.md`))
        .replace(/^(#{1,6} .*?) \[#[^\]]+\]$/gm, '$1')
        .replace(/\]\(\.\/([\w-]+)\.mdx?(#[^)]*)?\)/g, '](./$1.md$2)');
      writeFileSync(join(out, 'references', `${page.slug}.md`), body);
    }
    const { version } = JSON.parse(readFileSync('packages/ui/package.json', 'utf8')) as { version: string };
    const live = process.env.DOCS_ORIGIN
      ? ` The newest docs, for any version: ${process.env.DOCS_ORIGIN}/dev/llms.txt (and its MCP server, ${process.env.DOCS_ORIGIN}/api/mcp/dev).`
      : '';
    writeFileSync(
      join(out, 'SKILL.md'),
      `---
name: remy
description: The Remy platform's rules and tools for working in any Remy repo (remy-auth, or an app on @joeblew999/remy-ui ${version}). Use before changing anything in a Remy repo, choosing a tool, adding a page, writing docs, running its scripts or releasing.
---

# Remy platform rules (@joeblew999/remy-ui ${version})

Every Remy repo is a thin product on one platform: the package @joeblew999/remy-ui, whose \`remy\` bin is its tooling,
released as one version. These are that version's rules: remy-auth's developer docs, every page, as its docs serve
them to AI tools.${live} Every command: \`COMMANDS.md\` at the repo root (CLAUDE.md imports it). Start with "Agents: start here".

${pages.map((page) => `- [${page.title}](references/${page.slug}.md): ${page.description}`).join('\n')}
`,
    );
    console.log(
      `skills build: the remy skill, ${pages.length} pages from the docs as AI tools read them (${version}).`,
    );
  } finally {
    stop();
  }
}
