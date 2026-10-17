// What the command line can do, from the commands themselves (tools.ts and each module's `what` and
// `commands`): `remy help` prints it, `remy help --write` writes it to COMMANDS.md, which the developer docs
// include as their Commands page. Owner's rule: commands are never listed by hand in the docs (they drift);
// there is one list, and it is generated. `npm run dev:change` keeps COMMANDS.md current (check.ts), and a
// unit check fails when it is stale.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tools } from './tools.ts';

/** `remy help`: every command, one line each; a command with subcommands names them. */
export async function help(out: (line: string) => void): Promise<void> {
  const width = Math.max(...Object.keys(tools).map(key => key.length));
  out("remy <command> [args]   (npm run lists this app's scripts; a command run without a subcommand says its own)");
  for (const [command, load] of Object.entries(tools)) {
    const tool = await load();
    out(`  ${command.padEnd(width)}  ${tool.what}${tool.commands ? ` — ${Object.keys(tool.commands).join(' · ')}` : ''}`);
  }
  out("A flow step also answers bare (remy land …), as the scripts of apps on 0.15 say; the template's say remy flow <step>.");
  out('Every command, with each subcommand: COMMANDS.md (npx remy help --write).');
}

export const commandsFile = 'COMMANDS.md';

/** Text for a Markdown table cell: pipes escaped, and angle brackets outside code spans (the docs read it as MDX). */
const cell = (text: string) => text.split('`').map((part, index) => index % 2 ? part : part.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('`').replace(/\|/g, '\\|');

/** The commands as Markdown: the flow a person runs first, then every remy command and subcommand, then the app's other npm scripts. */
export async function commandsMarkdown(dir = '.'): Promise<string> {
  const scripts = existsSync(join(dir, 'package.json')) ? (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }).scripts ?? {} : {};
  const lines = [
    '_Generated from the command line itself (`npx remy help --write`; `npm run dev:change` keeps it current). Change a command\'s line in `packages/ui/src/cli`, never this file._',
    '',
    '## What you run',
    '',
    'Day to day, three: `npm run dev:change` after every edit, `npm run dev:land -- "<what changed>"` when the work is finished, `npm run dev:promote` to put main live.',
    '',
    '| Command | What it does |',
    '| --- | --- |',
  ];
  const flow = await tools.flow!();
  for (const [step, { what }] of Object.entries(flow.commands ?? {})) lines.push(`| \`npm run dev:${step}\` | ${cell(what)} |`);
  lines.push('', '## Everything the command line does', '', 'Each as `npx remy <command> [<subcommand>]`; a command run without a subcommand lists its own.', '', '| Command | What it does |', '| --- | --- |');
  for (const [name, load] of Object.entries(tools)) {
    if (name === 'flow') continue;
    const tool = await load();
    lines.push(`| \`npx remy ${name}\` | ${cell(tool.what)} |`);
    for (const [sub, { what }] of Object.entries(tool.commands ?? {})) lines.push(`| \`npx remy ${name} ${sub}\` | ${cell(what)} |`);
  }
  const others = Object.entries(scripts).filter(([, command]) => !/remy(\.ts)? /.test(command));
  if (others.length) {
    lines.push('', '## The other npm scripts', '', 'Shortcuts to the tools themselves, as package.json defines them.', '', '| Script | Runs |', '| --- | --- |');
    for (const [script, command] of others) lines.push(`| \`npm run ${script}\` | \`${command.replace(/\|/g, '\\|').replace(/`/g, "'")}\` |`);
  }
  return lines.join('\n') + '\n';
}

/**
 * The folders whose COMMANDS.md is written: this app, and in remy-auth the blank app too (template/), so a new
 * app starts with its own list, as every app keeps one (self-similar: what this repo has, every app has).
 */
export const commandsDirs = (): string[] => ['.', 'template'].filter(dir => dir === '.' || existsSync(join(dir, 'package.json')));

/**
 * Writes each folder's COMMANDS.md when it differs; true when any changed. With `verify` (npm run ci, here and on
 * GitHub) it writes nothing and fails on a stale one instead: CI says what dev:change would have fixed.
 */
export async function writeCommands(verify = false): Promise<boolean> {
  let changed = false;
  for (const dir of commandsDirs()) {
    const file = join(dir, commandsFile);
    const text = await commandsMarkdown(dir);
    if (existsSync(file) && readFileSync(file, 'utf8') === text) { console.log(`${file}: current.`); continue; }
    if (verify) { console.error(`${file} is not what the command line says: npm run dev:change rewrites it.`); process.exit(1); }
    writeFileSync(file, text);
    console.log(`${file}: written from the command line.`);
    changed = true;
  }
  return changed;
}
