// Project MCP registration (`remy mcp register|verify|status`): the Chrome DevTools MCP server from
// this install, for Codex (.codex/config.toml) and Claude Code (.mcp.json), in each client's own
// format, unrelated settings and servers kept. Absolute paths make editor launches independent of the
// shell's cwd; the generated files are gitignored, so re-register after moving the checkout.
import assert from 'node:assert/strict';
import { dispatch, type Subcommands } from './commands.ts';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { bin } from './config.ts';

type Json = Record<string, unknown>;

/** The server as this install runs it: Google's Chrome DevTools MCP over stdio, isolated and headless, telemetry off. */
function server(root: string): { command: string; args: string[] } {
  return {
    command: join(root, 'node_modules', '.bin', 'chrome-devtools-mcp'),
    args: ['--isolated', '--headless', '--no-usage-statistics', '--no-performance-crux'],
  };
}

/** Write (or with `check`, only verify) both clients' registration. */
export async function register(check = false, root = process.cwd()): Promise<void> {
  const { parse, stringify } = createRequire(join(root, 'package.json'))('smol-toml') as {
    parse: (text: string) => Json;
    stringify: (value: Json) => string;
  };
  const { command, args } = server(root);
  assert.ok(existsSync(command), `${command}: chrome-devtools-mcp is not installed (npm ci)`);
  const targets = [
    {
      file: '.codex/config.toml',
      decode: parse,
      encode: stringify,
      key: 'mcp_servers',
      server: { command, args, startup_timeout_sec: 30 } as Json,
    },
    {
      file: '.mcp.json',
      decode: JSON.parse as (text: string) => Json,
      encode: (value: Json) => JSON.stringify(value, null, 2) + '\n',
      key: 'mcpServers',
      server: { type: 'stdio', command, args } as Json,
    },
  ];
  for (const target of targets) {
    const path = join(root, target.file);
    const original = existsSync(path) ? readFileSync(path, 'utf8') : undefined;
    const config: Json = original === undefined ? {} : JSON.parse(JSON.stringify(target.decode(original)));
    assert.ok(config && typeof config === 'object', `${target.file}: invalid config`);
    const servers = (config[target.key] ??= {}) as Json;
    const same = JSON.stringify(servers['chrome-devtools']) === JSON.stringify(target.server);
    if (check)
      assert.ok(
        same,
        `${target.file}: Chrome DevTools is not registered as this install runs it; npx remy mcp register`,
      );
    else if (!same) {
      if (original !== undefined) writeFileSync(`${path}.bak`, original);
      servers['chrome-devtools'] = target.server;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, target.encode(config));
    }
    console.log(`${target.file}: Chrome DevTools ${check ? 'verified' : 'registered'}`);
  }
}

/** What the clients see (Claude also checks connectivity for approved servers); needs both CLIs. */
export function status(): void {
  for (const [command, args] of [
    [bin('codex'), ['mcp', 'get', 'chrome-devtools']],
    ['claude', ['mcp', 'get', 'chrome-devtools']],
  ] as const) {
    const result = spawnSync(command, [...args], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

export const what = 'the MCP servers for Claude and Codex, registered per machine';
export const commands: Subcommands = {
  register: { what: 'write .mcp.json and .codex/config.toml for this machine', run: () => register(false) },
  verify: { what: 'the registration as it should be, written if not', run: () => register(true) },
  status: { what: 'what each client has registered', run: () => status() },
};
export const main = dispatch('mcp', commands);
