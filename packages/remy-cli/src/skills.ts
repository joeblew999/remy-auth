// The remy skill this package ships (`remy skills build`), made from the developer docs. Installing skills is the
// standard skills CLI's, from skills-lock.json: `skills experimental_install`, and `skills experimental_sync` for the
// skills installed packages ship (this one among them).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dispatch, type Subcommands } from './commands.ts';
import { docsDir, origins } from './config.ts';

export const what = 'the remy skill the package ships, made from the developer docs';
export const commands: Subcommands = {
  build: {
    what: 'remy-auth: the remy skill the package ships, from the docs build as AI tools read it (llms.txt); the skills:build task runs it',
    run: () => buildSkill(),
  },
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
  if (!existsSync(join(docsDir() ?? 'docs', 'content/dev')) || !existsSync('packages/remy-ui/package.json')) {
    console.log('skills build: only remy-auth makes the remy skill (from its developer docs).');
    return;
  }
  // The docs' build is the skills:build task's dependency (vite.config.ts): served here, never built here.
  const { built, serveBuilt } = await import('./docs.ts');
  built();
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
    const out = join('packages', 'remy-ui', 'skills', 'remy');
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, 'references'), { recursive: true });
    for (const page of pages) {
      // The site's heading ids ("## Title [#id]") are the site's; a page's links to another (./x.md, ./x.mdx) name its file here.
      const body = (await text(`/dev/${page.slug}.md`))
        .replace(/^(#{1,6} .*?) \[#[^\]]+\]$/gm, '$1')
        .replace(/\]\(\.\/([\w-]+)\.mdx?(#[^)]*)?\)/g, '](./$1.md$2)');
      writeFileSync(join(out, 'references', `${page.slug}.md`), body);
    }
    const { version } = JSON.parse(readFileSync('packages/remy-ui/package.json', 'utf8')) as { version: string };
    const live = origins().docs
      ? ` The newest docs, for any version: ${origins().docs}/dev/llms.txt (and its MCP server, ${origins().docs}/api/mcp/dev).`
      : '';
    writeFileSync(
      join(out, 'SKILL.md'),
      `---
name: remy
description: The Remy platform's rules and tools for working in any Remy repo (remy-auth, or an app on @joeblew999/remy-ui ${version}). Use before changing anything in a Remy repo, choosing a tool, adding a page, writing docs, running its scripts or releasing.
---

# Remy platform rules (@joeblew999/remy-ui ${version})

Every Remy repo is a thin product on one platform: the package @joeblew999/remy-ui, with the \`remy\` command line (@joeblew999/remy-cli) as its tooling,
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
