// Groups installed skills by the source recorded in skills-lock.json: each real folder moves to
// .agents/skill-sources/<owner>/<repo>/<skill> and .agents/skills/<skill> becomes a symlink to it,
// because agents only discover skills one level deep. Idempotent; runs after skills:install.
import { readFileSync, lstatSync, mkdirSync, renameSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const { skills } = JSON.parse(readFileSync('skills-lock.json', 'utf8'));
let moved = 0;
for (const [name, { source }] of Object.entries(skills)) {
  const flat = join('.agents/skills', name);
  const grouped = join('.agents/skill-sources', source, name);
  if (!existsSync(flat) || lstatSync(flat).isSymbolicLink()) continue;
  mkdirSync(dirname(grouped), { recursive: true });
  rmSync(grouped, { recursive: true, force: true });
  renameSync(flat, grouped);
  symlinkSync(relative('.agents/skills', grouped), flat);
  moved++;
}
console.log(`Grouped ${moved} skills by source under .agents/skill-sources.`);
