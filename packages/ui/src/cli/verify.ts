// Verification. `remy verify setup` is what an installation must satisfy, about a minute, no browser:
// the dependencies, MCP registration, the guard, the CLI versions and the tooling invariants;
// `remy setup` and the upgrades end with it (`remy verify` alone runs it). The gate before a landing or a
// release is `vp run ci`, Vite Plus's, never a command of ours.
import assert from 'node:assert/strict';
import { dispatch, type Subcommands } from './commands.ts';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from './mcp.ts';
import { main as guard } from './register.ts';
import { pins, remySkillPath } from './skills.ts';
import { appDir } from './config.ts';

type Json = Record<string, any>;
const readJson = (file: string): Json => JSON.parse(readFileSync(file, 'utf8'));

function tool(command: string, args: string[], what = command): void {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`${what}: failed`);
    process.exit(result.status ?? 1);
  }
}

/** The versions of the CLIs the tooling runs, without contacting a Cloudflare account. */
export function doctor(): void {
  console.log(`node ${process.version}`);
  tool('npm', ['--version'], 'npm');
  for (const bin of ['wrangler', 'chrome-devtools-mcp', 'modern-web-guidance', 'codex']) {
    const path = join(process.cwd(), 'node_modules', '.bin', bin);
    if (existsSync(path)) {
      process.stdout.write(`${bin} `);
      tool(path, ['--version'], bin);
    } else console.log(`${bin}: not installed`);
  }
}

/**
 * The invariants every Remy app keeps that npm, Wrangler and the agents' tools do not check
 * themselves: every package.json matches the lockfile; the Worker's configuration keeps previews off
 * and observability on; the workflows name only commands that exist; every installed skill comes
 * from a pinned source, at its pin, with its Claude link.
 */
export async function tooling(): Promise<void> {
  const manifest = readJson('package.json');
  const lock = readJson('package-lock.json');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.deepEqual(
      lock.packages?.['']?.[section] ?? {},
      manifest[section] ?? {},
      `${section}: package-lock.json differs from package.json; run npm install`,
    );
  }
  for (const [location, locked] of Object.entries(lock.packages ?? {}) as [string, Json][]) {
    if (!location || location.startsWith('node_modules/') || location.includes('/node_modules/')) continue;
    if (!existsSync(`${location}/package.json`)) continue;
    const workspace = readJson(`${location}/package.json`);
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      assert.deepEqual(
        locked?.[section] ?? {},
        workspace[section] ?? {},
        `${location} ${section}: package-lock.json differs from its package.json; run npm install`,
      );
    }
  }
  console.log('Every package.json matches the lockfile.');

  const { unstable_readConfig } = (await import(
    pathToFileURL(createRequire(join(process.cwd(), 'package.json')).resolve('wrangler')).href
  )) as typeof import('wrangler');
  const config = unstable_readConfig({ config: join(appDir(), 'wrangler.jsonc') }) as Json;
  // preview_urls makes every uploaded version and alias public, old ones without the app's later fixes. Only a
  // Worker on Cloudflare's Worker Previews (a `previews` block, built by Workers Builds) turns it on, on purpose:
  // that is what gives each branch and pull request its preview URL (owner, 2026-10-17).
  if (config.previews === undefined)
    assert.equal(
      config.preview_urls,
      false,
      'wrangler.jsonc: preview_urls must be false (true only with a previews block)',
    );
  // Smart Placement: without it, a visitor far from the databases waits one ocean crossing per query (the
  // account page took 3.2 s from Asia, 2026-10-17). Inherited by every environment and Preview, so set once.
  assert.equal(
    config.placement?.mode,
    'smart',
    'wrangler.jsonc: "placement": { "mode": "smart" } (run the Worker near its databases)',
  );
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

  // The workflows hold no logic of their own: every command they name is one a developer runs the same way.
  const workflows = existsSync('.github/workflows')
    ? readdirSync('.github/workflows').filter((name) => /\.ya?ml$/.test(name))
    : [];
  if (workflows.length) {
    // What `vp run` can run: package.json's scripts and vite.config.ts's tasks, read from the file Vite Plus reads.
    const config = existsSync('vite.config.ts')
      ? ((await import(pathToFileURL(join(process.cwd(), 'vite.config.ts')).href)) as {
          default?: { run?: { tasks?: Record<string, unknown> } };
        })
      : {};
    const runnable = new Set([
      ...Object.keys(manifest.scripts ?? {}),
      ...Object.keys(config.default?.run?.tasks ?? {}),
    ]);
    for (const name of workflows) {
      const text = readFileSync(`.github/workflows/${name}`, 'utf8');
      // `vp run <name>` written out, and each job's `task:` in a matrix (the workflow runs `vp run ${{ matrix.task }}`).
      const named = [
        ...text.matchAll(/\b(?:npm|vp) run ([a-z0-9][a-z0-9:_-]*)/g),
        ...text.matchAll(/^\s*-?\s*task:\s*['"]?([a-z0-9][a-z0-9:_-]*)/gm),
      ];
      for (const match of named)
        assert.ok(
          runnable.has(match[1]!),
          `.github/workflows/${name} runs ${match[1]}, which is neither a package.json script nor a vite.config.ts task`,
        );
    }
    console.log(`The workflows name only commands that exist (${workflows.join(', ')}).`);
  }

  // The pins (skills.ts) are the single list of skill sources.
  const skills: Record<string, Json> = readJson('skills-lock.json').skills;
  const pinned = new Set(pins.map((pin) => new URL(pin.source).pathname.split('/').slice(1, 3).join('/')));
  for (const [name, skill] of Object.entries(skills)) {
    if (skill.sourceType === 'local' && skill.source === remySkillPath) continue;
    assert.ok(pinned.has(skill.source), `${name}: installed from ${skill.source}, which the pins do not name`);
  }
  for (const pin of pins) {
    const source = new URL(pin.source);
    const [owner, repo, tree, ref] = source.pathname.slice(1).split('/');
    assert.ok(
      source.hostname === 'github.com' && tree === 'tree' && /^[a-f0-9]{40}$/.test(ref ?? ''),
      `Invalid pinned skill source: ${pin.source}`,
    );
    const entries = Object.entries(skills).filter(([, skill]) => skill.source === `${owner}/${repo}`);
    assert.ok(entries.length > 0, `Missing skill pack: ${owner}/${repo}; npx remy skills install`);
    for (const [name, skill] of entries) {
      assert.match(name, /^[a-z0-9][a-z0-9-]*$/, 'Invalid skill directory name');
      assert.equal(skill.ref, ref, `${name}: installed source differs from the pin`);
      const canonical = `.agents/skills/${name}`;
      const link = `.claude/skills/${name}`;
      assert.ok(existsSync(`${canonical}/SKILL.md`), `${name}: not installed here; npx remy skills install`);
      assert.ok(readFileSync(`${canonical}/SKILL.md`, 'utf8').trim(), `${name}: empty SKILL.md`);
      assert.ok(lstatSync(link).isSymbolicLink(), `${name}: Claude path must be a symlink`);
      assert.equal(realpathSync(link), realpathSync(canonical), `${name}: incorrect Claude target`);
    }
    console.log(`${owner}/${repo}: verified ${entries.length} locked skills and Claude links.`);
  }
  console.log('Tooling verified.');
}

/** What an installation must satisfy, in seconds, no build: the check is vp run check, which vp run setup runs next. */
export async function verifySetup(): Promise<void> {
  tool('npm', ['ls', '--depth=0'], 'npm ls');
  await register(true);
  guard(['--check']);
  doctor();
  await tooling();
}

export const what = "the installation's checks";
export const commands: Subcommands = {
  setup: {
    what: "the installation's checks: npm ls, MCP, the guard, doctor, tooling (remy setup ends with them); the default",
    run: () => verifySetup(),
  },
  tooling: {
    what: "the lockfile, wrangler.jsonc's observability, placement and preview_urls, the workflows, the skill pins",
    run: () => tooling(),
  },
  doctor: { what: "the tooling's versions", run: () => doctor() },
};
export const main = dispatch('verify', commands, 'setup');
