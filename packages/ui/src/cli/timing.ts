// Every remy command is timed by the command line itself (remy.ts calls `begin`), not by the command
// (owner, 2026-10-17: "it should get it automatically because it's part of the CLI"). A run writes its
// record to node_modules/.cache/remy/<command>-last.txt: when it started, its parts, and its total with
// passed or failed. A remy command started inside another (ci runs `check types` and `check unit`, dev:land
// runs `i18n translate`, the consumer fixture's script) writes into the outer run's record, indented under
// it, so one `npm run ci` leaves one record of everything it ran. A command only marks its parts (`lap`)
// and adds detail it measured itself (`note`). `npx remy last [command]` prints a record; where the time
// goes is read from the run, never remembered.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { span, type Part } from './feedback.ts';

const parts: Part[] = [];
let mark = Date.now();
let file: string | undefined;
let indent = '';

const folder = () => join(process.cwd(), 'node_modules', '.cache', 'remy');
const fileOf = (command: string) => join(folder(), `${command.replace(/[^A-Za-z0-9]+/g, '-')}-last.txt`);
const write = (line: string) => { if (file) try { appendFileSync(file, indent + line + '\n'); } catch { /* a record is never worth a failure */ } };

/**
 * Starts timing this process as `command` (with its arguments, for the record): called once, by remy.ts,
 * for every command. Its total is written when the process exits, whatever the exit code; at the top
 * (not inside another remy run) it is also printed when the run took more than a moment.
 */
export function begin(command: string, args: string[]): void {
  const started = mark = Date.now();
  const depth = Number(process.env.REMY_RECORD_DEPTH ?? 0);
  indent = '  '.repeat(depth);
  if (process.env.REMY_RECORD) file = process.env.REMY_RECORD;
  else if (existsSync(join(process.cwd(), 'node_modules'))) { mkdirSync(folder(), { recursive: true }); file = fileOf(command); writeFileSync(file, ''); }
  write(`${[command, ...args].join(' ')}, started ${new Date(started).toISOString()}`);
  // What this run starts writes into this record, one level in.
  if (file) { process.env.REMY_RECORD = file; process.env.REMY_RECORD_DEPTH = String(depth + 1); }
  process.on('exit', code => {
    const took = Date.now() - started;
    const summary = `${command}: ${code === 0 ? 'passed' : `failed (exit ${code})`} in ${span(took)}${parts.length ? `: ${parts.map(part => `${part.what} ${span(part.ms)}`).join(', ')}` : ''}`;
    write(summary);
    if (depth === 0 && (parts.length || took >= 10_000)) console.log(`\n${summary}`);
  });
}

/** Ends a part of this run, named `what`: the time since the last part ended (or the run started). */
export function lap(what: string): void {
  const now = Date.now();
  parts.push({ what, ms: now - mark });
  mark = now;
  write(`  ${what} ${span(parts.at(-1)!.ms)}`);
}

/** The parts so far, for a command that sums itself up in its own words (dev:land's last line). */
export const laps = (): Part[] => [...parts];

/** Adds a time this run measured itself (one agent call, one step of a script) to the record, outside the parts. */
export function note(what: string, ms: number): void { write(`  ${what} ${span(ms)}`); }

/** The last record of `command` (or of whichever command ran last), or a line saying there is none. */
export function lastRecord(command?: string): string {
  if (command) return existsSync(fileOf(command)) ? readFileSync(fileOf(command), 'utf8').trimEnd() : `${command}: no run recorded in this checkout yet.`;
  const all = existsSync(folder()) ? readdirSync(folder()).filter(name => name.endsWith('-last.txt')).map(name => join(folder(), name)) : [];
  const latest = all.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  return latest ? readFileSync(latest, 'utf8').trimEnd() : 'no run recorded in this checkout yet.';
}

export const what = "[command]: the last run's record (when it started, its parts, its total), of a command or of whatever ran last";
export const main = async (args: string[]): Promise<void> => { console.log(lastRecord(args.join(' ') || undefined)); };
