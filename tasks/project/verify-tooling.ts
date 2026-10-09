// project:verify-tooling: the invariants every Remy app keeps that npm, mise and Wrangler do not check
// themselves. Runs in the app (the task's dir); smol-toml and Wrangler resolve from the app's install,
// since this file may sit in mise's cache of the shared tasks.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { readFile, realpath, lstat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

type Json = Record<string, any>;
const fromApp = createRequire(join(process.cwd(), 'package.json'));
const load = async (name: string) => import(pathToFileURL(fromApp.resolve(name)).href);
const { parse } = await load('smol-toml') as { parse: (text: string) => Json };
const { unstable_readConfig } = await load('wrangler') as { unstable_readConfig: (options: { config: string }) => Json };
const readJSON = async (path: string): Promise<Json> => JSON.parse(await readFile(path, 'utf8'));

try {
  const manifest = await readJSON('package.json');
  const lock = await readJSON('package-lock.json');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.deepEqual(lock.packages?.['']?.[section] ?? {}, manifest[section] ?? {},
      `${section}: package-lock.json differs from package.json; run npm install`);
  }
  // Every workspace the lockfile knows (packages the repository owns, its docs app).
  for (const [location, locked] of Object.entries(lock.packages ?? {}) as [string, Json][]) {
    if (!location || location.startsWith('node_modules/') || location.includes('/node_modules/')) continue;
    const workspace = await readJSON(`${location}/package.json`).catch(() => undefined);
    if (!workspace) continue;
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      assert.deepEqual(locked?.[section] ?? {}, workspace[section] ?? {},
        `${location} ${section}: package-lock.json differs from its package.json; run npm install`);
    }
  }
  console.log('Every package.json matches the lockfile.');

  // This upstream API is unstable; recheck it when upgrading Wrangler.
  const config = unstable_readConfig({ config: 'wrangler.jsonc' });
  // Every uploaded version and alias would be public, old ones without the app's later fixes (cf:preview
  // deploys a throwaway Worker instead).
  assert.equal(config.preview_urls, false, 'wrangler.jsonc: preview_urls must be false');
  const observability = config.observability;
  assert.equal(observability?.enabled, true, 'Worker observability must be enabled');
  assert.equal(observability?.redact_query_string, true, 'Query-string redaction must be enabled');
  for (const signal of ['logs', 'traces']) {
    assert.equal(observability?.[signal]?.enabled, true, `${signal} must be enabled`);
    assert.equal(observability?.[signal]?.persist, true, `${signal} must persist`);
    const rate = observability?.[signal]?.head_sampling_rate;
    assert.ok(Number.isFinite(rate) && rate > 0 && rate <= 1, `${signal}: invalid sampling rate`);
  }
  assert.equal(observability.logs.invocation_logs, true, 'Invocation logs must be enabled');
  console.log('Wrangler parsed the configuration; observability requirements pass.');

  // The workflow holds no logic of its own: every task it names is one a developer runs the same way,
  // so what GitHub checks and what a machine can check are one definition (tasks/*.toml).
  const workflows = existsSync('.github/workflows') ? readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name)) : [];
  if (workflows.length) {
    const tasks = new Set((JSON.parse(execFileSync('mise', ['tasks', 'ls', '--json'], { encoding: 'utf8' })) as { name: string }[]).map(task => task.name));
    for (const name of workflows) {
      const text = await readFile(`.github/workflows/${name}`, 'utf8');
      const named = [...text.matchAll(/\bmise run ([a-z0-9][a-z0-9:_-]*)/g), ...text.matchAll(/^\s*-?\s*task:\s*([a-z0-9][a-z0-9:_-]*)\s*$/gm)].map(match => match[1]!);
      for (const task of named) assert.ok(tasks.has(task), `.github/workflows/${name} runs mise task ${task}, which does not exist here`);
    }
    console.log(`The workflows name only tasks that exist (${workflows.join(', ')}).`);
  }

  // The skills:install task's *_skills_source vars in the shared skills.toml are the single list of skill sources.
  const vars: Record<string, string> = parse(await readFile(new URL('../skills.toml', import.meta.url), 'utf8'))['skills:install']?.vars ?? {};
  const sources = Object.entries(vars).filter(([key]) => key.endsWith('_skills_source')).map(([, url]) => url);
  assert.ok(sources.length > 0, 'tasks/skills.toml defines no *_skills_source pins');
  const skills: Record<string, Json> = (await readJSON('skills-lock.json')).skills;
  const pinned = new Set(sources.map(url => new URL(url).pathname.split('/').slice(1, 3).join('/')));
  for (const [name, skill] of Object.entries(skills)) {
    // The platform's own `remy` skill comes from the installed package, which its version pins.
    if (skill.sourceType === 'local' && skill.source === vars.remy_skill_path) continue;
    assert.ok(pinned.has(skill.source), `${name}: installed from ${skill.source}, which the shared skills.toml does not pin`);
  }
  for (const sourceURL of sources) {
    const source = new URL(sourceURL);
    const [owner, repo, tree, ref] = source.pathname.slice(1).split('/');
    assert.ok(source.hostname === 'github.com' && tree === 'tree' && /^[a-f0-9]{40}$/.test(ref ?? ''),
      `Invalid pinned skill source: ${sourceURL}`);
    const entries = Object.entries(skills).filter(([, skill]) => skill.source === `${owner}/${repo}`);
    assert.ok(entries.length > 0, `Missing skill pack: ${owner}/${repo}; run mise run skills:install`);
    for (const [name, skill] of entries) {
      assert.match(name, /^[a-z0-9][a-z0-9-]*$/, 'Invalid skill directory name');
      assert.equal(skill.ref, ref, `${name}: installed source differs from mise pin`);
      const canonical = `.agents/skills/${name}`;
      const link = `.claude/skills/${name}`;
      assert.ok((await readFile(`${canonical}/SKILL.md`, 'utf8')).trim(), `${name}: empty SKILL.md`);
      assert.ok((await lstat(link)).isSymbolicLink(), `${name}: Claude path must be a symlink`);
      assert.equal(await realpath(link), await realpath(canonical), `${name}: incorrect Claude target`);
    }
    console.log(`${owner}/${repo}: verified ${entries.length} locked skills and Claude links.`);
  }
  console.log('Tooling verified. GUI build and local runtime checks follow in project:verify.');
} catch (error) {
  console.error(`Tooling verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
