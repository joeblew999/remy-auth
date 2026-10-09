// The `remy` agent skill (.plans/thin-apps.md, group 2): the platform's rules for any Remy repo's agents,
// generated from their one source, remy-auth's English developer docs (docs/content/dev/<page>.md), into
// skills/remy/ (gitignored; shipped in the package's `files`). ui:generate runs it, so every pack and
// release carries the rules of its own version; a repo installs it with skills:install and its AGENTS.md
// points here (agents:rules).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const docs = join(here, '../../docs/content/dev');
const out = join(here, 'skills/remy');
const pages = ['how-we-work', 'development', 'tooling', 'tasks', 'ui-package', 'auth', 'writing-docs', 'gui'];
const { version } = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const front = text => Object.fromEntries([...(/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '').matchAll(/^(\w+):\s*"?(.*?)"?$/gm)].map(([, key, value]) => [key, value]));

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'references'), { recursive: true });
const rows = pages.map(page => {
  const file = [`${page}.md`, `${page}.mdx`].find(name => existsSync(join(docs, name)));
  if (!file) throw new Error(`skill.mjs: docs/content/dev/${page}.md(x) is missing`);
  const text = readFileSync(join(docs, file), 'utf8');
  writeFileSync(join(out, 'references', `${page}.md`), text);
  const { title, description } = front(text);
  return `- [${title}](references/${page}.md): ${description}`;
});
writeFileSync(join(out, 'SKILL.md'), `---
name: remy
description: The Remy platform's rules and tools for working in any Remy repo (remy-auth, or an app on @joeblew999/remy-ui ${version}). Use before changing anything in a Remy repo, choosing a tool, adding a page, writing docs, running its mise tasks or releasing.
---

# Remy platform rules (@joeblew999/remy-ui ${version})

Every Remy repo is a thin product on one platform: the package @joeblew999/remy-ui and remy-auth's shared
mise tasks, released together under one version. These are that version's rules, generated from remy-auth's
developer docs. Read "How we work" first; open the others when the task touches them.

${rows.join('\n')}

Run project commands through \`mise run <namespace:action>\`; \`mise tasks ls\` lists them.
`);
console.log(`skills/remy: SKILL.md and ${pages.length} references (${version})`);
