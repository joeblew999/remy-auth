// `remy rules`: the marked block in an app's AGENTS.md that points its agents at the platform's rules,
// the `remy` skill from the installed @joeblew999/remy-ui (`remy skills install` puts it in
// .agents/skills and .claude/skills), naming the version. Written or refreshed in place; the rest of
// AGENTS.md is the app's. Not in remy-auth: its AGENTS.md is a pointer to the rules' source,
// docs/content/dev/agents.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function rules(): void {
  if (existsSync('packages/ui/src/cli/remy.ts') && existsSync('docs/content/dev/how-we-work.md')) {
    console.log(
      'rules: remy-auth owns the rules (docs/content/dev/agents.md, which AGENTS.md points at); nothing to write.',
    );
    return;
  }
  const pkg = 'node_modules/@joeblew999/remy-ui/package.json';
  if (!existsSync(pkg)) {
    console.error('rules: @joeblew999/remy-ui is not installed (npm run setup)');
    process.exit(1);
  }
  const { version } = JSON.parse(readFileSync(pkg, 'utf8')) as { version: string };
  const begin = '<!-- BEGIN:remy-rules (written by remy rules; edit around it, not in it) -->';
  const end = '<!-- END:remy-rules -->';
  const block = `${begin}
This repo is built on the Remy platform: @joeblew999/remy-ui ${version}, whose \`remy\` bin is its tooling.
Its rules are the \`remy\` skill; read \`.agents/skills/remy/SKILL.md\` (Claude:
\`.claude/skills/remy/SKILL.md\`) before changing anything. It lists the references: how we work, the
development principles, tooling, the UI package and writing docs.
The flow is code, and the only way to work here: \`COMMANDS.md\` lists it first, then every command, generated
from the command line itself (\`npm run dev:change\` keeps it current; never list commands by hand). The
tooling refuses the heavy checks outside the flow's steps. Long steps run in the background; never wait on them.
Seen something wrong, slow, missing or left over? Fix it in the same landing when small, or write it
into \`.plans/now.md\` in that landing; \`dev:status\` shows that list to everyone. "Done" is the end
of a sweep (branches, pull requests, deployments, plans, retired words, touched docs), not of a list.
${end}`;
  const current = existsSync('AGENTS.md') ? readFileSync('AGENTS.md', 'utf8') : '# Agent instructions\n';
  const marked = new RegExp(
    `(?:${begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|<!-- BEGIN:remy-rules[^>]*-->)[\\s\\S]*?${end}`,
  );
  const next = marked.test(current) ? current.replace(marked, block) : `${current.trimEnd()}\n\n${block}\n`;
  if (next === current) console.log(`rules: AGENTS.md already points at the remy skill (${version}).`);
  else {
    writeFileSync('AGENTS.md', next);
    console.log(`rules: AGENTS.md points at the remy skill (${version}).`);
  }
}

export const what = "the platform's rules block in AGENTS.md, written or refreshed in place";
export const main = (): void => rules();
