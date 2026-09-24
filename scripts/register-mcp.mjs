import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'smol-toml';

// Project-only registration. Preserve unrelated settings and servers using their
// native formats. Absolute paths make editor launches independent of shell cwd.
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
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
