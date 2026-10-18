// What the command line can do, from the commands themselves (tools.ts and each module's `what` and
// `commands`): `remy help` prints it, `remy help --write` writes it to COMMANDS.md, which the developer docs
// include as their Commands page. Owner's rule: commands are never listed by hand in the docs (they drift);
// there is one list, and it is generated. `vp run fix` writes COMMANDS.md, and the check fails when it is stale.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listed, tools } from './tools.ts';

/**
 * What a person runs, each with what it does (COMMANDS.md's first table and `remy help`). A script's line ends with
 * its steps as the repository's package.json has them, the order in plain sight.
 */
const frontDoor = (scripts: Record<string, string>): [string, string][] => {
  const steps = (name: string) =>
    scripts[name] ? ` (${scripts[name].replace(/node \S+\/remy\.ts /g, 'remy ').replaceAll(' && ', ' → ')})` : '';
  return [
    ['vp run dev', 'the app with hot reload, its local state (.dev.vars, the migrations) and generated files first'],
    ['vp run build', 'the production build, after the same; no upload'],
    ['vp run preview', "the production build on Cloudflare's local host, at PREVIEW_PORT (4173)"],
    [
      'vp run ready',
      "after every change: everything generated, the builds, Wrangler's deployment dry run, the project's own checks, the unit checks, then vp check (format, lint, types)",
    ],
    ['vp run fix', "what the checks only verify, written: COMMANDS.md and each docs page's ending"],
    [
      'vp run ci',
      `what GitHub runs, the same here, each part one of GitHub's jobs (vp run test:browser --shard 1/3)${steps('ci')}`,
    ],
    [
      'vp run translate',
      `before a commit that changed text: the translations it made stale or missing${steps('translate')}`,
    ],
    [
      'vp run release',
      `the owner's: every check in every language, the release checks, the publish rehearsed, Core Web Vitals, then the tag GitHub publishes from${steps('release')}`,
    ],
    ['vp run setup', `an installation, then every check${steps('setup')}`],
  ];
};

/** `remy help`: every command, one line each; a command with subcommands names them. */
export async function help(out: (line: string) => void): Promise<void> {
  const width = Math.max(...listed().map((key) => key.length));
  out(
    "remy <command> [args]   (vp run lists this app's tasks and scripts; a command run without a subcommand says its own)",
  );
  for (const command of listed()) {
    const tool = await tools[command]!();
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
    "_Generated from the command line and package.json (`vp run fix` writes it; the check fails when it is stale). Change a command's line in remy-cli (`packages/remy-cli/src`), a script in package.json, a task in its package's vite.config.ts, never this file._",
    '',
    '## What you run',
    '',
    "Day to day: `vp run ready` after every edit; when the work is finished, git and GitHub's own commands: `git commit`, `git push` (its hook runs `vp run ci` first), `gh pr create`, `gh pr merge --auto --squash` (GitHub merges once its checks pass). `vp run release` is the owner's; Cloudflare deploys main by itself. `vp dev`, `vp build`, `vp preview` and `vp check` are Vite Plus's own tools, without the app's preparation; `vp run` lists every task and script, and `vp run --last-details` says what the last run did.",
    '',
    '| Command | What it does |',
    '| --- | --- |',
  ];
  for (const [command, what] of frontDoor(scripts)) lines.push(`| \`${command}\` | ${cell(what)} |`);
  lines.push(
    '',
    '## Everything the command line does',
    '',
    'Each as `npx remy <command> [<subcommand>]`; a command run without a subcommand lists its own.',
    '',
    '| Command | What it does |',
    '| --- | --- |',
  );
  for (const name of listed()) {
    const tool = await tools[name]!();
    lines.push(`| \`npx remy ${name}\` | ${cell(tool.what)} |`);
    for (const [sub, { what }] of Object.entries(tool.commands ?? {}))
      lines.push(`| \`npx remy ${name} ${sub}\` | ${cell(what)} |`);
  }
  const front = new Set(frontDoor(scripts).map(([command]) => command.split(' ')[2]));
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
 * GitHub) it writes nothing and fails on a stale one instead: CI says what vp run ready would have fixed.
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
