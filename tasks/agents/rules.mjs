// agents:rules: the marked block in this repo's AGENTS.md that points its agents at the platform's rules,
// the `remy` skill from the installed @joeblew999/remy-ui (skills:install puts it in .agents/skills and
// .claude/skills), naming the version. Written or refreshed in place; the rest of AGENTS.md is the repo's.
// Not in remy-auth: its AGENTS.md indexes the rules' source, docs/content/dev.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('tasks') && existsSync('docs/content/dev/how-we-work.md')) {
  console.log('agents:rules: remy-auth indexes the rules themselves (AGENTS.md); nothing to write.');
  process.exit(0);
}
const pkg = 'node_modules/@joeblew999/remy-ui/package.json';
if (!existsSync(pkg)) throw new Error('agents:rules: @joeblew999/remy-ui is not installed (mise run project:setup)');
const { version } = JSON.parse(readFileSync(pkg, 'utf8'));
const begin = '<!-- BEGIN:remy-rules (written by mise run agents:rules; edit around it, not in it) -->';
const end = '<!-- END:remy-rules -->';
const block = `${begin}
This repo is built on the Remy platform: @joeblew999/remy-ui ${version} and remy-auth's shared mise tasks
at the same tag. Its rules are the \`remy\` skill; read \`.agents/skills/remy/SKILL.md\` (Claude:
\`.claude/skills/remy/SKILL.md\`) before changing anything. It lists the references: how we work, the
development principles, tooling, the shared tasks, the UI package and writing docs.
${end}`;
const current = existsSync('AGENTS.md') ? readFileSync('AGENTS.md', 'utf8') : '# Agent instructions\n';
const marked = new RegExp(`${begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end}`);
const next = marked.test(current) ? current.replace(marked, block) : `${current.trimEnd()}\n\n${block}\n`;
if (next === current) console.log(`agents:rules: AGENTS.md already points at the remy skill (${version}).`);
else { writeFileSync('AGENTS.md', next); console.log(`agents:rules: AGENTS.md points at the remy skill (${version}).`); }
