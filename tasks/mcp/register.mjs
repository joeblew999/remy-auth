// Registers Chrome DevTools MCP for the including project; run through the `mcp:register` file task beside this file.
// Runs from the including project's root (mise's default for file tasks), also when this
// directory is included from another repository. Preserves unrelated settings and servers in
// their native formats; absolute paths make editor launches independent of shell cwd.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const root = process.cwd();
const { parse, stringify } = createRequire(join(root, 'package.json'))('smol-toml');
const command = execFileSync('which', ['mise'], { encoding: 'utf8' }).trim();
assert.ok(command.startsWith('/'), 'mise must resolve to an absolute executable path');
const args = ['--cd', root, '--quiet', 'run', 'browser:mcp'];
const check = process.argv.includes('--check');
const targets = [
  { file: '.codex/config.toml', decode: parse, encode: stringify,
    key: 'mcp_servers', server: { command, args, startup_timeout_sec: 30 } },
  { file: '.mcp.json', decode: JSON.parse, encode: value => JSON.stringify(value, null, 2) + '\n',
    key: 'mcpServers', server: { type: 'stdio', command, args } },
];

// Parse both before making changes so invalid existing configuration fails early.
for (const target of targets) {
  let text;
  try { text = await readFile(target.file, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  target.original = text;
  target.config = text === undefined ? {} : JSON.parse(JSON.stringify(target.decode(text)));
  assert.ok(target.config && typeof target.config === 'object', `${target.file}: invalid config`);
  target.config[target.key] ??= {};
  if (check) {
    assert.deepEqual(target.config[target.key]['chrome-devtools'], target.server,
      `${target.file}: run mise run mcp:register`);
  }
}
for (const target of targets) {
  if (!check) {
    const current = target.config[target.key]['chrome-devtools'];
    if (JSON.stringify(current) !== JSON.stringify(target.server)) {
      // Retain a local recovery copy before reserializing an existing config.
      if (target.original !== undefined) await writeFile(`${target.file}.bak`, target.original);
      target.config[target.key]['chrome-devtools'] = target.server;
      await mkdir(dirname(target.file), { recursive: true });
      await writeFile(target.file, target.encode(target.config));
    }
  }
  console.log(`${target.file}: Chrome DevTools ${check ? 'verified' : 'registered'}`);
}
