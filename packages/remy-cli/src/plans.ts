// The plans rule as code (docs/content/dev/how-we-work.md, "Plans: few, short, closed"): `remy plans
// status|check|close|park|open`, on the app's .plans/ from its root: .plans/now.md is the one ordered
// list, .plans/*.md the few open plan files, .plans/done/ and .plans/parked/ the closed and parked
// ones, .plans/stability-log.md optional. `check` is part of the check (remy-check plans, the check:plans task). Node built-ins and
// git only; no network.
import { execFileSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { docsDir } from './config.ts';

const root = process.cwd();
const plansDir = join(root, '.plans');
const nowFile = join(plansDir, 'now.md');
const notPlans = new Set(['now.md', 'stability-log.md']);
const staleDays = 14;
const today = new Date().toISOString().slice(0, 10);

const rel = (file: string) => relative(root, file).split(sep).join('/');
const read = (file: string) => readFileSync(file, 'utf8');
const mdIn = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.md'))
        .sort()
        .map((name) => join(dir, name))
    : [];
const openPlans = () => mdIn(plansDir).filter((file) => !notPlans.has(basename(file)));

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function walk(dir: string, keep: (path: string) => boolean = () => true): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'node_modules' || entry.name.startsWith('.git') ? [] : walk(path, keep);
    return keep(path) ? [path] : [];
  });
}

export type Link = { line: number; target: string; column: number };

/** Relative Markdown links, inline `](target)` and reference `[id]: target`, outside code. */
export function links(text: string): Link[] {
  const found: Link[] = [];
  let fenced = false;
  text.split('\n').forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) return;
    const plain = line.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length));
    for (const match of plain.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g))
      found.push({ line: index, target: match[1]!, column: match.index });
    const reference = plain.match(/^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)/);
    if (reference) found.push({ line: index, target: reference[1]!, column: 0 });
  });
  return found.filter(
    ({ target }) => !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#') && !target.startsWith('/'),
  );
}

const splitTarget = (target: string): [string, string] => {
  const cut = target.search(/[?#]/);
  return cut < 0 ? [target, ''] : [target.slice(0, cut), target.slice(cut)];
};
const resolveFrom = (file: string, path: string) => resolve(dirname(file), decodeURI(path));
const linkTo = (from: string, to: string) =>
  posix.relative(dirname(from).split(sep).join('/'), to.split(sep).join('/'));

/** Rewrite the relative links of one text: target (absolute path) -> new absolute path, or null to leave it. */
function rewrite(
  file: string,
  text: string,
  mapTarget: (path: string) => string | null,
  base = file,
): { text: string; changed: number } {
  const lines = text.split('\n');
  const perLine = new Map<number, [string, string, number][]>();
  for (const link of links(text)) {
    const [path, rest] = splitTarget(link.target);
    if (!path) continue;
    const moved = mapTarget(resolveFrom(base, path));
    if (!moved) continue;
    const next = linkTo(file, moved) + rest;
    if (next !== link.target)
      perLine.set(link.line, [...(perLine.get(link.line) ?? []), [link.target, next, link.column]]);
  }
  for (const [index, changes] of perLine) {
    let line = lines[index]!;
    // Replace from the right so earlier columns stay valid.
    for (const [from, to, column] of changes.sort((a, b) => b[2] - a[2])) {
      const at = line.indexOf(from, column);
      if (at >= 0) line = line.slice(0, at) + to + line.slice(at + from.length);
    }
    lines[index] = line;
  }
  return { text: lines.join('\n'), changed: perLine.size };
}

/** Markdown files whose links may point at a plan. */
function linkingFiles(): string[] {
  const isMd = (path: string) => path.endsWith('.md');
  const packages = existsSync(join(root, 'packages'))
    ? readdirSync(join(root, 'packages'))
        .map((name) => join(root, 'packages', name, 'README.md'))
        .filter(existsSync)
    : [];
  return [
    ...new Set([
      ...walk(plansDir, isMd),
      ...walk(docsDir(root) ?? join(root, 'docs'), isMd),
      ...walk(join(root, 'tasks'), isMd),
      ...packages,
      ...mdIn(root),
    ]),
  ];
}

export type NowItem = { section: string; text: string; closed: boolean };

/** now.md's list items (a line starting with "- " or "1. ", with its indented continuation lines), by section. */
export function nowItems(text: string): NowItem[] {
  const items: { section: string; text: string }[] = [];
  let section = '';
  for (const line of text.split('\n')) {
    const heading = line.match(/^#{2,6}\s+(.*)/);
    if (heading) {
      section = heading[1]!.trim();
      continue;
    }
    const item = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)/);
    if (item) items.push({ section, text: item[1]!.trim() });
    else if (/^\s+\S/.test(line) && items.length) items.at(-1)!.text += ` ${line.trim()}`;
  }
  return items.map((item) => ({ ...item, closed: item.text.startsWith('~~') }));
}

function planInfo(file: string) {
  const text = read(file);
  const title = text.match(/^#\s+(.*)/m)?.[1]!.trim() ?? basename(file, '.md');
  const state =
    text
      .split('\n')
      .find((line) => /^(Status:|Closed\b|Parked\b)/.test(line.trim()))
      ?.trim() ?? '';
  const lastCommit = git('log', '-1', '--format=%cs', '--', rel(file));
  const age = lastCommit ? Math.floor((Date.parse(today) - Date.parse(lastCommit)) / 86400000) : null;
  return {
    file: rel(file),
    title,
    state,
    lastCommit: lastCommit || null,
    stale: age !== null && age > staleDays,
    dirty: git('status', '--porcelain', '--', rel(file)) !== '',
  };
}

function status(args: string[]): void {
  if (!existsSync(plansDir)) {
    console.log(args.includes('--json') ? JSON.stringify({ plans: false }) : 'No plans: this project has no .plans/.');
    return;
  }
  const report = {
    plans: true,
    now: existsSync(nowFile) ? rel(nowFile) : null,
    open: existsSync(nowFile) ? nowItems(read(nowFile)).filter((item) => !item.closed) : [],
    planFiles: openPlans().map(planInfo),
    parked: mdIn(join(plansDir, 'parked')).map((file) => ({ file: rel(file), title: planInfo(file).title })),
    done: mdIn(join(plansDir, 'done')).length,
  };
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const clip = (text: string) => (text.length > 110 ? `${text.slice(0, 107)}...` : text);
  console.log(report.now ? `Open in ${report.now} (${report.open.length}):` : 'No .plans/now.md.');
  let section: string | undefined;
  for (const item of report.open) {
    if (item.section !== section) console.log(`  ${(section = item.section) || '(top)'}`);
    console.log(`    - ${clip(item.text)}`);
  }
  console.log(`\nOpen plan files (${report.planFiles.length}):`);
  for (const plan of report.planFiles) {
    const flags = [plan.stale && `STALE: last commit over ${staleDays} days ago`, plan.dirty && 'uncommitted changes']
      .filter(Boolean)
      .join(', ');
    console.log(
      `  ${plan.file}  (last commit ${plan.lastCommit ?? 'none'})${flags ? `  ${flags}` : ''}\n    ${clip(plan.state || '(no Status:, Closed or Parked line)')}`,
    );
  }
  console.log(`\nParked (${report.parked.length}): ${report.parked.map((plan) => plan.file).join(', ') || 'none'}`);
  console.log(`Done: ${report.done} in .plans/done/`);
}

/** What is wrong with .plans/, one sentence each; nothing when it is tidy. */
export function plansProblems(): string[] {
  const problems: string[] = [];
  if (!existsSync(nowFile)) problems.push('.plans/now.md is missing: it is the one ordered list of open work.');
  const allowed = new Set(['done', 'parked']);
  for (const file of walk(plansDir, (path) => path.endsWith('.md'))) {
    const parts = rel(file).split('/').slice(1);
    if (parts.length > 1 && !(parts.length === 2 && allowed.has(parts[0]!)))
      problems.push(`${rel(file)}: a stray plan; plans live in .plans/, .plans/done/ or .plans/parked/.`);
    for (const link of links(read(file))) {
      const [path] = splitTarget(link.target);
      if (!path.endsWith('.md')) continue;
      if (!existsSync(resolveFrom(file, path)))
        problems.push(`${rel(file)}:${link.line + 1}: link to ${link.target} does not resolve.`);
    }
  }
  if (existsSync(nowFile)) {
    const linked = new Set(links(read(nowFile)).map((link) => resolveFrom(nowFile, splitTarget(link.target)[0])));
    for (const file of openPlans())
      if (!linked.has(file))
        problems.push(`${rel(file)}: an open plan not linked from .plans/now.md (link it, close it or park it).`);
  }
  return problems;
}

/** The plans part of the check: instant, no network; a project with no .plans/ passes. */
export function check(): void {
  if (!existsSync(plansDir)) {
    console.log('plans: no plans (no .plans/).');
    return;
  }
  const problems = plansProblems();
  if (problems.length)
    fail(`plans: ${problems.length} problem(s):\n${problems.map((problem) => `  ${problem}`).join('\n')}`);
  console.log(
    `plans: ok (${openPlans().length} open plan file(s), ${existsSync(nowFile) ? nowItems(read(nowFile)).filter((item) => !item.closed).length : 0} open item(s) in now.md).`,
  );
}

function findPlan(name: string, from: string[]): string {
  const file = `${basename(name).replace(/\.md$/, '')}.md`;
  const candidates = from.map((dir) => join(dir, file)).filter(existsSync);
  if (!candidates.length)
    fail(
      `No plan ${file} in ${from.map(rel).join(' or ')}. Open plans: ${
        openPlans()
          .map((plan) => basename(plan, '.md'))
          .join(', ') || 'none'
      }.`,
    );
  if (notPlans.has(file)) fail(`${file} is not a plan.`);
  return candidates[0]!;
}

type Move = 'close' | 'park' | 'open';

/**
 * close, park and open: note the line under the title, move the file, repoint links to and from it;
 * close and park strike its item in now.md, open leaves now.md to its author (the item is new work).
 */
function move(kind: Move, word: string, args: string[]): void {
  const [name, ...note] = args;
  const reason = note.join(' ').trim();
  if (!name || !reason) fail(`Usage: npx remy plans ${kind} <plan> "<${kind === 'close' ? 'what shipped' : 'why'}>"`);
  if (!existsSync(plansDir)) fail('No .plans/ here.');
  const from: Record<Move, string[]> = {
    close: [plansDir, join(plansDir, 'parked')],
    park: [plansDir],
    open: [join(plansDir, 'parked')],
  };
  const into: Record<Move, string> = { close: 'done', park: 'parked', open: '' };
  const source = findPlan(name, from[kind]);
  const target = join(plansDir, into[kind], basename(source));
  if (existsSync(target)) fail(`${rel(target)} already exists.`);

  // The note under the title, and the plan's own links now resolve from its new folder.
  const lines = read(source).split('\n');
  const title = lines.findIndex((line) => /^#\s/.test(line));
  const noteLine = `${word} ${today}: ${reason}`;
  if (title < 0) lines.unshift(noteLine, '');
  else lines.splice(title + 1, 0, '', noteLine, ...(lines[title + 1]?.trim() === '' ? [] : ['']));
  const own = rewrite(target, lines.join('\n'), (path) => (path === source ? target : path), source);
  writeFileSync(source, own.text);

  mkdirSync(dirname(target), { recursive: true });
  const tracked = git('ls-files', '--error-unmatch', rel(source)) !== '';
  if (tracked) execFileSync('git', ['mv', rel(source), rel(target)], { cwd: root, stdio: 'inherit' });
  else renameSync(source, target);

  // Links to it from everywhere else.
  const touched: string[] = [];
  for (const file of linkingFiles()) {
    if (file === target) continue;
    const result = rewrite(file, read(file), (path) => (path === source ? target : null));
    if (result.changed) {
      writeFileSync(file, result.text);
      touched.push(`${rel(file)} (${result.changed})`);
    }
  }

  // Strike its item in now.md (now pointing at the new place).
  let struck = false;
  if (kind !== 'open' && existsSync(nowFile)) {
    const nowLines = read(nowFile).split('\n');
    for (const link of links(nowLines.join('\n'))) {
      if (resolveFrom(nowFile, splitTarget(link.target)[0]) !== target) continue;
      let index = link.line;
      while (index > 0 && !/^(?:[-*+]|\d+[.)])\s/.test(nowLines[index]!) && /^\s/.test(nowLines[index]!)) index--;
      const item = nowLines[index]!.match(/^((?:[-*+]|\d+[.)])\s+)(.*)$/);
      if (!item || item[2]!.startsWith('~~')) continue;
      const bold = item[2]!.match(/^(\*\*[^*]+\*\*)(.*)$/);
      nowLines[index] = bold
        ? `${item[1]}~~${bold[1]}~~ ${word.toLowerCase()} ${today}${bold[2]}`
        : `${item[1]}~~${item[2]}~~ ${word.toLowerCase()} ${today}`;
      struck = true;
    }
    if (struck) writeFileSync(nowFile, nowLines.join('\n'));
  }

  console.log(`${word}: ${rel(source)} -> ${rel(target)}${tracked ? ' (git mv)' : ''}`);
  console.log(`  own links repointed: ${own.changed} line(s)`);
  console.log(`  links to it repointed: ${touched.join(', ') || 'none'}`);
  console.log(
    `  now.md: ${kind === 'open' ? 'add its item, in the order it closes' : struck ? 'struck its item' : 'no open item links to it'}`,
  );
  console.log('Review with git diff, then vp run ready.');
}

export const what = "the plans rule on this app's .plans/: few, short, closed";
export const commands: Subcommands = {
  status: {
    what: "[--json]: now.md's open items, the open plans with their status line and last commit (STALE after 14 days), the parked ones",
    run: (rest) => status(rest),
  },
  check: {
    what: 'now.md exists, every link under .plans/ resolves, every open plan is linked from now.md; instant (the check runs it)',
    run: () => check(),
  },
  close: {
    what: '<plan> "<what shipped>": into done/ with its closing line, links to it repointed, its now.md item struck; staged, never committed',
    run: (rest) => move('close', 'Closed', rest),
  },
  park: { what: '<plan> "<why>": the same into parked/', run: (rest) => move('park', 'Parked', rest) },
  open: {
    what: '<plan> "<why now>": a parked plan back into .plans/; its now.md item is yours to add',
    run: (rest) => move('open', 'Opened', rest),
  },
};
export const main = dispatch('plans', commands);
