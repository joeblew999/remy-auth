// The translator (`remy i18n translate`, which `dev:land` runs in the change, before its commit): the
// machine's Claude Code, headless and with no tools, translates exactly the gaps the checks list (i18n.ts),
// one language (messages) or one page (docs) per call, I18N_JOBS at a time, and writes the files it asked
// for with the record of what each was made from; nothing else, and no commit (the change commits them
// with the English, one push, one run of the checks). A stale page whose sections still line up gets only
// its changed sections translated again. What it writes is written only when it is the thing asked for
// (page.ts). Every worktree translates its own files, so agents working at once need no lock: two branches
// that change the same English section already meet at that English (owner, 2026-10-17: translating on
// main after the merge, under a lock, took ages and pushed main twice per landing).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { changedSections, docsGaps, messagesGaps, pagePrints, print, readRecord, recordFile, sections, splice, withRecord, withoutRecord, type Gap } from './i18n.ts';
import { pageFrom } from './page.ts';
import { lap, note } from './timing.ts';
import { docsPrompt, messagesPrompt } from './prompts.ts';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
function refuse(message: string): never { console.error(message); process.exit(2); }
const model = () => process.env.I18N_MODEL ?? 'sonnet';
const jobs = () => Number(process.env.I18N_JOBS ?? 4);
const languageName = (locale: string) => new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale;

type AgentReport = { structured_output?: unknown; subtype?: string; result?: unknown; duration_ms?: number; duration_api_ms?: number; num_turns?: number; usage?: { output_tokens?: number } };

/**
 * Claude Code headless, from a scratch directory (no CLAUDE.md, hooks, settings, MCP servers or
 * skills), no tools: the prompt on stdin, the structured result back. Every call says on stderr what
 * it took, from Claude Code's own report, so a slow translation is a number in the log. A run with
 * no structured result says what Claude Code said and fails.
 */
async function agent(system: string, schema: object, input: string, what: string): Promise<unknown> {
  const scratch = mkdtempSync(join(tmpdir(), 'remy-translate-'));
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const child = spawn('claude', ['-p', '--tools', '', '--strict-mcp-config', '--disable-slash-commands', '--setting-sources', '', '--no-session-persistence', '--model', model(), '--system-prompt', system, '--output-format', 'json', '--json-schema', JSON.stringify(schema)], {
        cwd: scratch, stdio: ['pipe', 'pipe', 'inherit'],
        env: { ...process.env, DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' },
      });
      let out = '';
      child.stdout.setEncoding('utf8'); child.stdout.on('data', chunk => { out += chunk; });
      child.on('error', reject);
      child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(`claude exited with ${code}`))));
      child.stdin.end(input);
    });
    const report = JSON.parse(text) as AgentReport;
    console.error(`  ${what}: the agent took ${Math.round((report.duration_ms ?? 0) / 1000)} s (${Math.round((report.duration_api_ms ?? 0) / 1000)} s in the API, ${report.num_turns ?? '?'} turn(s), ${report.usage?.output_tokens ?? '?'} tokens written)`);
    note(`${what}, ${report.usage?.output_tokens ?? '?'} tokens written:`, report.duration_ms ?? 0);
    if (report.structured_output === undefined || report.structured_output === null) throw new Error(`the agent returned no result (${report.subtype ?? 'no subtype'}): ${String(report.result ?? '').slice(0, 300)}`);
    return report.structured_output;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

/** Up to `limit` of `items` at a time; true when every one succeeded. */
async function all<T>(items: T[], limit: number, work: (item: T) => Promise<boolean>): Promise<boolean> {
  const queue = [...items]; const results: boolean[] = [];
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => { for (let item = queue.shift(); item !== undefined; item = queue.shift()) results.push(await work(item).catch(error => { console.error(`  ${error instanceof Error ? error.message : String(error)}`); return false; })); }));
  return results.every(Boolean);
}

/** A translation merged in English key order: the agent's value, else the one there, never null. */
function merged(english: Record<string, unknown>, current: Record<string, unknown>, fresh: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(english)) { const value = fresh[key] ?? current[key]; if (value != null) out[key] = value; }
  return out;
}
const writeJson = (file: string, value: unknown) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
/** A catalog's record after translating `keys`: each now made from the current English, in English key order. */
function recorded(catalog: string, english: Record<string, unknown>, keys: string[]): void {
  const record = { ...readRecord(catalog) };
  for (const key of keys) record[key] = print(english[key]);
  writeJson(recordFile(catalog), Object.fromEntries(Object.keys(english).filter(key => record[key]).map(key => [key, record[key]])));
}

/** The catalogs' gaps, one language per agent call. True when nothing is left wrong. */
export async function translateMessages(): Promise<boolean> {
  const { gaps, english: englishFile } = await messagesGaps();
  const work = gaps.filter(gap => !['extra', 'unlisted', 'unserved'].includes(gap.kind));
  if (!englishFile || !work.length) { console.log('Messages: nothing to translate.'); return true; }
  const inlang = process.env.I18N_INLANG ?? git('ls-files', '--', '*project.inlang/settings.json').split('\n')[0]!.replace(/\/settings\.json$/, '');
  const settings = JSON.parse(readFileSync(join(inlang, 'settings.json'), 'utf8')) as { 'plugin.inlang.messageFormat'?: { pathPattern: string } };
  const pattern = settings['plugin.inlang.messageFormat']?.pathPattern ?? './messages/{locale}.json';
  const fileOf = (locale: string) => join(dirname(inlang), pattern.replace('{locale}', locale));
  const english = JSON.parse(readFileSync(englishFile, 'utf8')) as Record<string, unknown>;
  const locales = [...new Set(work.map(gap => gap.language))].sort();
  console.log(`Messages: translating ${locales.length} languages with ${model()} (${jobs()} at a time)...`);
  const numbers = [...Array(1001).keys(), 1.5];
  const categories = (locale: string, type: 'cardinal' | 'ordinal') => [...new Set(numbers.map(n => new Intl.PluralRules(locale, { type }).select(n)))];
  let ok = await all(locales, jobs(), async locale => {
    const file = fileOf(locale);
    if (!existsSync(file)) writeJson(file, {});
    const whole = work.some(gap => gap.language === locale && gap.kind === 'catalog');
    const keys = whole ? Object.keys(english) : [...new Set(work.filter(gap => gap.language === locale && gap.kind !== 'catalog').map(gap => gap.what.split(' ')[0]!))];
    const entries = Object.fromEntries(keys.filter(key => key in english).map(key => [key, english[key]]));
    const input = JSON.stringify({ locale, language: languageName(locale), plural: { cardinal: categories(locale, 'cardinal'), ordinal: categories(locale, 'ordinal') }, entries });
    const got = await agent(messagesPrompt, { type: 'object', additionalProperties: { anyOf: [{ type: 'string' }, { type: 'array' }] } }, input, locale) as Record<string, unknown>;
    const lacking = keys.filter(key => !(key in got));
    if (lacking.length) { console.error(`  ${locale}: the agent left out ${lacking.join(' ')}`); return false; }
    const current = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeJson(file, merged(english, current, got));
    recorded(file, english, keys);
    console.log(`  ${locale}: ${keys.length} messages`);
    return true;
  });
  // What the agent wrote must pass the offline checks before it counts: missing keys, placeholders, plurals.
  const after = (await messagesGaps()).gaps.filter(gap => !['extra', 'unlisted', 'unserved'].includes(gap.kind));
  if (after.length) { console.log(`Still wrong after translating:\n${after.map(gap => `${gap.language} ${gap.kind} ${gap.what}`).join('\n')}`); ok = false; }
  return ok;
}

const suffix = /\.([a-z]{2,3}(?:-[A-Za-z]{2,4})?)\.mdx?$/;

/** The docs' gaps, one page per agent call; named translation files are redone in full. True when every one was written. */
export async function translateDocs(redo: string[] = []): Promise<boolean> {
  const dir = process.env.I18N_DOCS_DIR ?? 'docs/content';
  const list: Gap[] = docsGaps().gaps.filter(gap => gap.kind !== 'orphan');
  for (const file of redo) { const match = suffix.exec(file); if (!match) refuse(`Not a translation file: ${file}`); list.push({ language: match[1]!, kind: 'redo', what: file }); }
  if (!list.length) { console.log('Docs: nothing to translate.'); return true; }
  const pages = list.filter(gap => ['missing', 'stale', 'redo'].includes(gap.kind) && !gap.what.endsWith('.json'));
  const uiLanguages = [...new Set(list.filter(gap => gap.kind.startsWith('ui-') || gap.what.endsWith('.json')).map(gap => gap.language))].sort();
  const schema = { type: 'object', properties: { content: { type: 'string' } }, required: ['content'], additionalProperties: false };
  const page = async (gap: Gap): Promise<boolean> => {
    const translation = gap.what; const lang = gap.language;
    const source = translation.replace(new RegExp(`\\.${lang}\\.(mdx?)$`), '.$1');
    const site = basename(dirname(source));
    const englishText = readFileSync(source, 'utf8');
    const lines = [`Language: ${lang} (${languageName(lang)}). Site: ${site} (${site === 'users' ? 'the product guide, for people using the app' : 'developer docs'}).`];
    // A stale page whose sections still line up with its record: only the sections whose English changed go
    // to the agent, and its answer is spliced into the translation as it is. Writing the whole page back for a
    // one-line change is what made a landing's translation take minutes (owner, 2026-10-17: "it takes ages").
    const current = existsSync(translation) ? readFileSync(translation, 'utf8') : '';
    const changed = gap.kind === 'stale' ? changedSections(englishText, current) : undefined;
    let written: string;
    if (changed) {
      const englishParts = sections(englishText), translatedParts = sections(withoutRecord(current));
      const asked = changed.map(index => ({ index, english: englishParts[index], previousTranslation: translatedParts[index] }));
      const input = [lines[0], 'Only these sections of the page changed in English. Translate each again, keeping sentences that are still right as they are; return each section whole, starting with its heading line when it has one.', JSON.stringify(asked)].join('\n');
      const got = await agent(docsPrompt, { type: 'object', properties: { sections: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, content: { type: 'string' } }, required: ['index', 'content'], additionalProperties: false } } }, required: ['sections'], additionalProperties: false }, input, `${translation} (${changed.length} of ${englishParts.length} sections)`) as { sections: { index: number; content: string }[] };
      const answered = new Map(got.sections.map(part => [part.index, part.content]));
      const lacking = changed.filter(index => !answered.has(index));
      if (lacking.length) { console.error(`  ${translation}: the agent left out sections ${lacking.join(', ')}; nothing written`); return false; }
      written = splice(englishText, current, new Map(changed.map(index => [index, answered.get(index)!])));
    } else {
      if (gap.kind === 'missing') lines.push('Translate this English file into a new translation.', '<english>', englishText, '</english>');
      else lines.push('Bring this translation fully in line with the current English: translate anything missing or changed, remove what the English no longer has, and keep sentences that are already right as they are.', '<english>', englishText, '</english>', '<translation>', withoutRecord(current), '</translation>');
      const result = await agent(docsPrompt, schema, lines.join('\n'), translation);
      written = typeof result === 'object' && result !== null && 'content' in result && typeof result.content === 'string' ? result.content : '';
    }
    // What the agent returned is written only when it is the page (page.ts): on 2026-10-09 a failed agent's "null" was committed as a page.
    const accepted = pageFrom({ content: written }, englishText);
    if ('refused' in accepted) { console.error(`  ${translation}: ${accepted.refused}; nothing written, the page is as it was`); return false; }
    writeFileSync(translation, withRecord(accepted.content, pagePrints(englishText)));
    console.log(`  ${gap.kind} ${translation}${changed ? ` (${changed.length} of ${sections(englishText).length} sections)` : ''}`);
    return true;
  };
  const ui = async (lang: string): Promise<boolean> => {
    const englishFile = `${dir}/ui/en.json`; const file = `${dir}/ui/${lang}.json`;
    if (!existsSync(file)) writeJson(file, {});
    const englishUi = JSON.parse(readFileSync(englishFile, 'utf8')) as Record<string, unknown>;
    const whole = list.some(gap => gap.language === lang && gap.kind === 'missing' && gap.what === file);
    const keys = whole ? Object.keys(englishUi) : list.filter(gap => gap.language === lang && gap.kind.startsWith('ui-')).map(gap => gap.what);
    const entries = Object.fromEntries(keys.filter(key => key in englishUi).map(key => [key, englishUi[key]]));
    const got = await agent(messagesPrompt, { type: 'object', additionalProperties: { type: 'string' } }, JSON.stringify({ locale: lang, language: languageName(lang), plural: {}, entries }), file) as Record<string, unknown>;
    const current = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const lacking = keys.filter(key => key in englishUi && !(key in got));
    if (lacking.length) { console.error(`  ${file}: the agent left out ${lacking.join(' ')}`); return false; }
    writeJson(file, merged(englishUi, current, got));
    recorded(file, englishUi, keys);
    console.log(`  ui ${file}`);
    return true;
  };
  const units: (() => Promise<boolean>)[] = [...pages.map(gap => () => page(gap)), ...uiLanguages.map(lang => () => ui(lang))];
  console.log(`Docs: ${units.length} translations with ${model()} (${jobs()} at a time)...`);
  return all(units, jobs(), unit => unit());
}

/** Both, messages then docs: what `dev:land` runs in the change, before its commit. */
export async function translate(args: string[]): Promise<void> {
  const [which, ...rest] = args;
  const messages = which === undefined || which === 'messages' ? await translateMessages() : true;
  if (which === undefined || which === 'messages') lap('messages');
  const docs = which === undefined || which === 'docs' ? await translateDocs(rest) : true;
  if (which === undefined || which === 'docs') lap('docs');
  if (!messages || !docs) process.exit(1);
}
