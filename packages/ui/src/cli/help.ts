// What the command line can do, from the commands themselves (tools.ts and each module's `what` and
// `commands`): `remy help` prints it, `remy help --write` writes it to COMMANDS.md, which the developer docs
// include as their Commands page. Owner's rule: commands are never listed by hand in the docs (they drift);
// there is one list, and it is generated. `vp run fix` writes COMMANDS.md, and the check fails when it is stale.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tools } from './tools.ts';

/** What a person runs, by its Vite Plus name: the lines are tasks.js's, beside the tasks and scripts they describe. */
const frontDoor = async (): Promise<[string, string][]> =>
  (await import('@joeblew999/remy-ui/workspace')).frontDoor() as [string, string][];

/** `remy help`: every command, one line each; a command with subcommands names them. */
export async function help(out: (line: string) => void): Promise<void> {
  const width = Math.max(...Object.keys(tools).map((key) => key.length));
  out(
    "remy <command> [args]   (vp run lists this app's tasks and scripts; a command run without a subcommand says its own)",
  );
  for (const [command, load] of Object.entries(tools)) {
    const tool = await load();
    out(
      `  ${command.padEnd(width)}  ${tool.what}${tool.commands ? ` — ${Object.keys(tool.commands).join(' · ')}` : ''}`,
    );
  }
  out('Every command, with each subcommand: COMMANDS.md (vp run fix writes it).');
}

export const commandsFile = 'COMMANDS.md';

/** Text for a Markdown table cell: pipes escaped, and angle brackets outside code spans (the docs read it as MDX). */
const cell = (text: string) =>
  text
    .split('`')
    .map((part, index) => (index % 2 ? part : part.replace(/</g, '&lt;').replace(/>/g, '&gt;')))
    .join('`')
    .replace(/\|/g, '\\|');

/** The commands as Markdown: the flow a person runs first, then every remy command and subcommand, then the app's other npm scripts. */
export async function commandsMarkdown(dir = '.'): Promise<string> {
  const scripts = existsSync(join(dir, 'package.json'))
    ? ((JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }).scripts ??
      {})
    : {};
  const lines = [
    "_Generated from the command line and the shared tasks (`vp run fix` writes it; the check fails when it is stale). Change a command's line in `packages/ui/src/cli`, a task's or script's in `packages/ui/src/tasks.js`, never this file._",
    '',
    '## What you run',
    '',
    "Day to day, two: `vp run check` after every edit, `vp run land \"<what changed>\"` when the work is finished. `vp run promote` and `vp run release` are the owner's. `vp dev`, `vp build`, `vp preview` and `vp check` are Vite Plus's own tools, without the app's preparation; `vp run --last-details` says what the last run did.",
    '',
    '| Command | What it does |',
    '| --- | --- |',
  ];
  for (const [command, what] of await frontDoor()) lines.push(`| \`${command}\` | ${cell(what)} |`);
  lines.push(
    '',
    '## Everything the command line does',
    '',
    'Each as `npx remy <command> [<subcommand>]`; a command run without a subcommand lists its own.',
    '',
    '| Command | What it does |',
    '| --- | --- |',
  );
  for (const [name, load] of Object.entries(tools)) {
    const tool = await load();
    lines.push(`| \`npx remy ${name}\` | ${cell(tool.what)} |`);
    for (const [sub, { what }] of Object.entries(tool.commands ?? {}))
      lines.push(`| \`npx remy ${name} ${sub}\` | ${cell(what)} |`);
  }
  const front = new Set((await frontDoor()).map(([command]) => command.split(' ')[2]));
  const others = Object.entries(scripts).filter(([name, command]) => !front.has(name) && !/remy(\.ts)? /.test(command));
  if (others.length) {
    lines.push(
      '',
      '## The other scripts',
      '',
      "The repository's own tools, as package.json defines them, each run as `vp run <script>`.",
      '',
      '| Script | Runs |',
      '| --- | --- |',
    );
    for (const [script, command] of others)
      lines.push(`| \`vp run ${script}\` | \`${command.replace(/\|/g, '\\|').replace(/`/g, "'")}\` |`);
  }
  return lines.join('\n') + '\n';
}

/**
 * The folders whose COMMANDS.md is written: this app, and in remy-auth the blank app too (template/), so a new
 * app starts with its own list, as every app keeps one (self-similar: what this repo has, every app has).
 */
export const commandsDirs = (): string[] =>
  ['.', 'template'].filter((dir) => dir === '.' || existsSync(join(dir, 'package.json')));

/**
 * Writes each folder's COMMANDS.md when it differs; true when any changed. With `verify` (vp run ci, here and on
 * GitHub) it writes nothing and fails on a stale one instead: CI says what vp run check would have fixed.
 */
export async function writeCommands(verify = false): Promise<boolean> {
  let changed = false;
  for (const dir of commandsDirs()) {
    const file = join(dir, commandsFile);
    const text = await commandsMarkdown(dir);
    if (existsSync(file) && readFileSync(file, 'utf8') === text) {
      console.log(`${file}: current.`);
      continue;
    }
    if (verify) {
      console.error(`${file} is not what the command line says: vp run fix writes it.`);
      process.exit(1);
    }
    writeFileSync(file, text);
    console.log(`${file}: written from the command line.`);
    changed = true;
  }
  return changed;
}
