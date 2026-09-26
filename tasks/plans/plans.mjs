// The plans rule as tasks (docs/content/dev/how-we-work.md, "Plans: few, short, closed"): plans:status, plans:check,
// plans:close and plans:park. Works on the including project's .plans/ from its root (the current
// directory): .plans/now.md is the one ordered list, .plans/*.md the few open plan files,
// .plans/done/ and .plans/parked/ the closed and parked ones, .plans/stability-log.md optional.
// Node built-ins and git only; no network.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const plansDir = join(root, '.plans');
const nowFile = join(plansDir, 'now.md');
const notPlans = new Set(['now.md', 'stability-log.md']);
const staleDays = 14;
const today = new Date().toISOString().slice(0, 10);

const [command, ...args] = process.argv.slice(2);
const rel = file => relative(root, file).split(sep).join('/');
const read = file => readFileSync(file, 'utf8');
const mdIn = dir => (existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.md')).sort().map(name => join(dir, name)) : []);
const openPlans = () => mdIn(plansDir).filter(file => !notPlans.has(basename(file)));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function git(...gitArgs) {
  try {
    return execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function walk(dir, keep = () => true) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.git') ? [] : walk(path, keep);
    return keep(path) ? [path] : [];
  });
}

// Relative Markdown links, inline `](target)` and reference `[id]: target`, outside code.
function links(text) {
  const found = [];
  let fenced = false;
  text.split('\n').forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) return;
    const plain = line.replace(/`[^`]*`/g, match => ' '.repeat(match.length));
    for (const match of plain.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) found.push({ line: index, target: match[1], column: match.index });
    const reference = plain.match(/^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)/);
    if (reference) found.push({ line: index, target: reference[1], column: 0 });
  });
  return found.filter(({ target }) => !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#') && !target.startsWith('/'));
}

const splitTarget = target => {
  const cut = target.search(/[?#]/);
  return cut < 0 ? [target, ''] : [target.slice(0, cut), target.slice(cut)];
};
const resolveFrom = (file, path) => resolve(dirname(file), decodeURI(path));
const linkTo = (from, to) => posix.relative(dirname(from).split(sep).join('/'), to.split(sep).join('/'));

// Rewrite the relative links of one text: target(absolute path) -> new absolute path or null.
function rewrite(file, text, mapTarget, base = file) {
  const lines = text.split('\n');
  const perLine = new Map();
  for (const link of links(text)) {
    const [path, rest] = splitTarget(link.target);
    if (!path) continue;
    const moved = mapTarget(resolveFrom(base, path));
    if (!moved) continue;
    const next = linkTo(file, moved) + rest;
    if (next !== link.target) perLine.set(link.line, [...(perLine.get(link.line) ?? []), [link.target, next, link.column]]);
  }
  for (const [index, changes] of perLine) {
    let line = lines[index];
    // Replace from the right so earlier columns stay valid.
    for (const [from, to, column] of changes.sort((a, b) => b[2] - a[2])) {
      const at = line.indexOf(from, column);
      if (at >= 0) line = line.slice(0, at) + to + line.slice(at + from.length);
    }
    lines[index] = line;
  }
  return { text: lines.join('\n'), changed: perLine.size };
}

// Markdown files whose links may point at a plan.
function linkingFiles() {
  const isMd = path => path.endsWith('.md');
  const packages = existsSync(join(root, 'packages'))
    ? readdirSync(join(root, 'packages')).map(name => join(root, 'packages', name, 'README.md')).filter(existsSync)
    : [];
  return [...new Set([...walk(plansDir, isMd), ...walk(join(root, 'docs'), isMd), ...walk(join(root, 'tasks'), isMd), ...packages, ...mdIn(root)])];
}

// now.md list items (a line starting with "- " or "1. ", with its indented continuation lines), by section.
function nowItems() {
  if (!existsSync(nowFile)) return [];
  const items = [];
  let section = '';
  for (const line of read(nowFile).split('\n')) {
    const heading = line.match(/^#{2,6}\s+(.*)/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    const item = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)/);
    if (item) items.push({ section, text: item[1].trim() });
    else if (/^\s+\S/.test(line) && items.length) items.at(-1).text += ` ${line.trim()}`;
  }
  return items.map(item => ({ ...item, closed: item.text.startsWith('~~') }));
}

function planInfo(file) {
  const text = read(file);
  const title = text.match(/^#\s+(.*)/m)?.[1].trim() ?? basename(file, '.md');
  const state = text.split('\n').find(line => /^(Status:|Closed\b|Parked\b)/.test(line.trim()))?.trim() ?? '';
  const lastCommit = git('log', '-1', '--format=%cs', '--', rel(file));
  const age = lastCommit ? Math.floor((Date.parse(today) - Date.parse(lastCommit)) / 86400000) : null;
  return { file: rel(file), title, state, lastCommit: lastCommit || null, stale: age !== null && age > staleDays, dirty: git('status', '--porcelain', '--', rel(file)) !== '' };
}

function status() {
  if (!existsSync(plansDir)) return console.log(args.includes('--json') ? JSON.stringify({ plans: false }) : 'No plans: this project has no .plans/.');
  const report = {
    plans: true,
    now: existsSync(nowFile) ? rel(nowFile) : null,
    open: nowItems().filter(item => !item.closed),
    planFiles: openPlans().map(planInfo),
    parked: mdIn(join(plansDir, 'parked')).map(file => ({ file: rel(file), title: planInfo(file).title })),
    done: mdIn(join(plansDir, 'done')).length,
  };
  if (args.includes('--json')) return console.log(JSON.stringify(report, null, 2));
  const clip = text => (text.length > 110 ? `${text.slice(0, 107)}...` : text);
  console.log(report.now ? `Open in ${report.now} (${report.open.length}):` : 'No .plans/now.md.');
  let section;
  for (const item of report.open) {
    if (item.section !== section) console.log(`  ${(section = item.section) || '(top)'}`);
    console.log(`    - ${clip(item.text)}`);
  }
  console.log(`\nOpen plan files (${report.planFiles.length}):`);
  for (const plan of report.planFiles) {
    const flags = [plan.stale && `STALE: last commit over ${staleDays} days ago`, plan.dirty && 'uncommitted changes'].filter(Boolean).join(', ');
    console.log(`  ${plan.file}  (last commit ${plan.lastCommit ?? 'none'})${flags ? `  ${flags}` : ''}\n    ${clip(plan.state || '(no Status:, Closed or Parked line)')}`);
  }
  console.log(`\nParked (${report.parked.length}): ${report.parked.map(plan => plan.file).join(', ') || 'none'}`);
  console.log(`Done: ${report.done} in .plans/done/`);
}

function check() {
  if (!existsSync(plansDir)) return console.log('plans:check: no plans (no .plans/).');
  const problems = [];
  if (!existsSync(nowFile)) problems.push('.plans/now.md is missing: it is the one ordered list of open work.');
  const allowed = new Set(['done', 'parked']);
  for (const file of walk(plansDir, path => path.endsWith('.md'))) {
    const parts = rel(file).split('/').slice(1);
    if (parts.length > 1 && !(parts.length === 2 && allowed.has(parts[0]))) problems.push(`${rel(file)}: a stray plan; plans live in .plans/, .plans/done/ or .plans/parked/.`);
    for (const link of links(read(file))) {
      const [path] = splitTarget(link.target);
      if (!path.endsWith('.md')) continue;
      if (!existsSync(resolveFrom(file, path))) problems.push(`${rel(file)}:${link.line + 1}: link to ${link.target} does not resolve.`);
    }
  }
  if (existsSync(nowFile)) {
    const linked = new Set(links(read(nowFile)).map(link => resolveFrom(nowFile, splitTarget(link.target)[0])));
    for (const file of openPlans()) if (!linked.has(file)) problems.push(`${rel(file)}: an open plan not linked from .plans/now.md (link it, close it or park it).`);
  }
  if (problems.length) fail(`plans:check: ${problems.length} problem(s):\n${problems.map(problem => `  ${problem}`).join('\n')}`);
  console.log(`plans:check: ok (${openPlans().length} open plan file(s), ${nowItems().filter(item => !item.closed).length} open item(s) in now.md).`);
}

function findPlan(name, from) {
  const file = `${basename(name).replace(/\.md$/, '')}.md`;
  const candidates = from.map(dir => join(dir, file)).filter(existsSync);
  if (!candidates.length) fail(`No plan ${file} in ${from.map(rel).join(' or ')}. Open plans: ${openPlans().map(plan => basename(plan, '.md')).join(', ') || 'none'}.`);
  if (notPlans.has(file)) fail(`${file} is not a plan.`);
  return candidates[0];
}

// close and park: note the line under the title, move the file, repoint links to and from it, strike it in now.md.
function move(kind, word) {
  const [name, ...note] = args;
  const reason = note.join(' ').trim();
  if (!name || !reason) fail(`Usage: mise run plans:${kind} -- <plan> "<${kind === 'close' ? 'what shipped' : 'why'}>"`);
  if (!existsSync(plansDir)) fail('No .plans/ here.');
  const source = findPlan(name, kind === 'close' ? [plansDir, join(plansDir, 'parked')] : [plansDir]);
  const target = join(plansDir, kind === 'close' ? 'done' : 'parked', basename(source));
  if (existsSync(target)) fail(`${rel(target)} already exists.`);

  // The note under the title, and the plan's own links now resolve from its new folder.
  const lines = read(source).split('\n');
  const title = lines.findIndex(line => /^#\s/.test(line));
  const noteLine = `${word} ${today}: ${reason}`;
  if (title < 0) lines.unshift(noteLine, '');
  else lines.splice(title + 1, 0, '', noteLine, ...(lines[title + 1]?.trim() === '' ? [] : ['']));
  const own = rewrite(target, lines.join('\n'), path => (path === source ? target : path), source);
  writeFileSync(source, own.text);

  mkdirSync(dirname(target), { recursive: true });
  const tracked = git('ls-files', '--error-unmatch', rel(source)) !== '';
  if (tracked) execFileSync('git', ['mv', rel(source), rel(target)], { cwd: root, stdio: 'inherit' });
  else renameSync(source, target);

  // Links to it from everywhere else.
  const touched = [];
  for (const file of linkingFiles()) {
    if (file === target) continue;
    const result = rewrite(file, read(file), path => (path === source ? target : null));
    if (result.changed) {
      writeFileSync(file, result.text);
      touched.push(`${rel(file)} (${result.changed})`);
    }
  }

  // Strike its item in now.md (now pointing at the new place).
  let struck = false;
  if (existsSync(nowFile)) {
    const nowLines = read(nowFile).split('\n');
    for (const link of links(nowLines.join('\n'))) {
      if (resolveFrom(nowFile, splitTarget(link.target)[0]) !== target) continue;
      let index = link.line;
      while (index > 0 && !/^(?:[-*+]|\d+[.)])\s/.test(nowLines[index]) && /^\s/.test(nowLines[index])) index--;
      const item = nowLines[index].match(/^((?:[-*+]|\d+[.)])\s+)(.*)$/);
      if (!item || item[2].startsWith('~~')) continue;
      const bold = item[2].match(/^(\*\*[^*]+\*\*)(.*)$/);
      nowLines[index] = bold ? `${item[1]}~~${bold[1]}~~ ${word.toLowerCase()} ${today}${bold[2]}` : `${item[1]}~~${item[2]}~~ ${word.toLowerCase()} ${today}`;
      struck = true;
    }
    if (struck) writeFileSync(nowFile, nowLines.join('\n'));
  }

  console.log(`${word}: ${rel(source)} -> ${rel(target)}${tracked ? ' (git mv)' : ''}`);
  console.log(`  own links repointed: ${own.changed} line(s)`);
  console.log(`  links to it repointed: ${touched.join(', ') || 'none'}`);
  console.log(`  now.md: ${struck ? 'struck its item' : 'no open item links to it'}`);
  console.log('Review with git diff, then mise run plans:check.');
}

const commands = { status, check, close: () => move('close', 'Closed'), park: () => move('park', 'Parked') };
if (!commands[command]) fail(`Unknown command ${command}; one of ${Object.keys(commands).join(', ')}.`);
commands[command]();
