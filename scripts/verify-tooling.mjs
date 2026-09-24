import assert from 'node:assert/strict';
import { readFile, realpath, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';
import { unstable_readConfig } from 'wrangler';

// Only repo-specific invariants: npm, mise and Wrangler own their validation.
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const readJSON = async (path) => JSON.parse(await readFile(path, 'utf8'));

try {
  const manifest = await readJSON('package.json');
  const lock = await readJSON('package-lock.json');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.deepEqual(lock.packages?.['']?.[section] ?? {}, manifest[section] ?? {},
      `${section}: package-lock.json differs from package.json; run npm install`);
  }
  const ui = await readJSON('packages/ui/package.json');
  for (const section of ['dependencies', 'peerDependencies']) {
    assert.deepEqual(lock.packages?.['packages/ui']?.[section] ?? {}, ui[section] ?? {},
      `Shared UI ${section}: lockfile differs from manifest`);
  }
  console.log('Root and shared UI dependency declarations match the lockfile.');

  // This upstream API is unstable; recheck it when upgrading Wrangler.
  const config = unstable_readConfig({ config: 'wrangler.jsonc' });
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

  // The skills:install task's *_skills_source vars in tasks/bootstrap.toml are the single list of skill sources.
  const vars = parse(await readFile('tasks/bootstrap.toml', 'utf8'))['skills:install']?.vars ?? {};
  const sources = Object.entries(vars).filter(([key]) => key.endsWith('_skills_source')).map(([, url]) => url);
  assert.ok(sources.length > 0, 'tasks/bootstrap.toml defines no *_skills_source pins');
  const skills = (await readJSON('skills-lock.json')).skills;
  const pinned = new Set(sources.map(url => new URL(url).pathname.split('/').slice(1, 3).join('/')));
  for (const [name, skill] of Object.entries(skills)) {
    assert.ok(pinned.has(skill.source), `${name}: installed from ${skill.source}, which mise.toml does not pin`);
  }
  for (const sourceURL of sources) {
    const source = new URL(sourceURL);
    const [owner, repo, tree, ref] = source.pathname.slice(1).split('/');
    assert.ok(source.hostname === 'github.com' && tree === 'tree' && /^[a-f0-9]{40}$/.test(ref),
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
  console.error(`Tooling verification failed: ${error.message}`);
  process.exitCode = 1;
}
