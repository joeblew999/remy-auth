// Translations, checked offline (`remy i18n check [messages|docs] [--list]`): read-only, no network,
// safe in any number of worktrees at once. The commit is the mark: a translation is stale when its
// English changed after the translation's last commit (git decides). A gap is one line, "<language>
// <kind> <what>", which the translators read with --list; without it, counts per language and kind.
// Exit 1 on any gap (the translation step and the release gate), a warning while coding (check.ts).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export type Gap = { language: string; kind: string; what: string };
const gapLine = (gap: Gap) => `${gap.language} ${gap.kind} ${gap.what}`;

function git(cwd: string, ...args: string[]): string | undefined {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return undefined; }
}
const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

/** The {placeholders} of a plain message; a message with variants (an array) is the plural check's. */
function placeholders(value: unknown): Set<string> {
  const found = new Set<string>();
  if (typeof value === 'string') for (const match of value.matchAll(/\{([A-Za-z_]\w*)\}/g)) found.add(match[1]!);
  return found;
}

type Variants = { declarations?: string[]; selectors?: string[]; match?: Record<string, string> }[];

/**
 * Plural categories per locale, which no upstream tool checks: for each Paraglide plural selector
 * (`local X = n: plural`, optionally `type=ordinal`), the categories Intl.PluralRules gives the locale
 * for 0 to 1000 and 1.5 must each have a variant; `*` covers only `other`.
 */
export function pluralGaps(locale: string, english: Record<string, unknown>, catalog: Record<string, unknown>): Gap[] {
  const numbers = [...Array(1001).keys(), 1.5];
  const gaps: Gap[] = [];
  for (const [key, value] of Object.entries(catalog)) {
    if (!Array.isArray(value) || !Array.isArray(english[key])) continue;
    const { declarations = [], selectors = [], match = {} } = (value as Variants)[0] ?? {};
    for (const selector of selectors) {
      const declaration = declarations.find(line => new RegExp(`^local ${selector} = \\w+: plural\\b`).test(line));
      if (!declaration) continue;
      const rules = new Intl.PluralRules(locale, { type: /type=ordinal/.test(declaration) ? 'ordinal' : 'cardinal' });
      const have = new Set(Object.keys(match).flatMap(variant => variant.split(/\s+/)).filter(part => part.startsWith(`${selector}=`)).map(part => part.slice(selector.length + 1).replace(/^\*$/, 'other')));
      const lacking = [...new Set(numbers.map(n => rules.select(n)))].filter(category => !have.has(category));
      if (lacking.length) gaps.push({ language: locale, kind: 'plural', what: `${key} ${lacking.join(',')}` });
    }
  }
  return gaps;
}

/**
 * UI messages (Paraglide catalogs) against English: missing catalogs and keys, extra keys, keys whose
 * English changed since the catalog's last commit, placeholders lost or invented, plural categories,
 * and the same languages as the platform (every page is served in each language the platform
 * routes, so a catalog lists exactly those).
 */
export async function messagesGaps(cwd = process.cwd()): Promise<{ gaps: Gap[]; english?: string; locales: number }> {
  const inlang = process.env.I18N_INLANG ?? git(cwd, 'ls-files', '--', '*project.inlang/settings.json')?.split('\n').filter(Boolean)[0]?.replace(/\/settings\.json$/, '');
  const settingsFile = inlang ? join(cwd, inlang, 'settings.json') : undefined;
  if (!settingsFile || !existsSync(settingsFile)) return { gaps: [], locales: 0 };
  const settings = readJson(settingsFile) as { baseLocale: string; locales: string[]; 'plugin.inlang.messageFormat'?: { pathPattern: string } };
  const pattern = settings['plugin.inlang.messageFormat']?.pathPattern ?? './messages/{locale}.json';
  // The pattern is relative to the folder that holds project.inlang (inlang's own rule).
  const fileOf = (locale: string) => join(dirname(dirname(settingsFile)), pattern.replace('{locale}', locale));
  const englishFile = fileOf(settings.baseLocale);
  const english = readJson(englishFile);
  const gaps: Gap[] = [];
  for (const locale of settings.locales.filter(locale => locale !== settings.baseLocale)) {
    const file = fileOf(locale);
    if (!existsSync(file)) { gaps.push({ language: locale, kind: 'catalog', what: relative(cwd, file) }); continue; }
    const catalog = readJson(file);
    for (const key of Object.keys(english)) if (!(key in catalog)) gaps.push({ language: locale, kind: 'missing', what: key });
    for (const key of Object.keys(catalog)) if (!(key in english)) gaps.push({ language: locale, kind: 'extra', what: key });
    const commit = git(cwd, 'log', '-1', '--format=%H', '--', relative(cwd, file));
    const before = commit ? git(cwd, 'show', `${commit}:${relative(cwd, englishFile)}`) : undefined;
    if (before) {
      const old = JSON.parse(before) as Record<string, unknown>;
      for (const [key, value] of Object.entries(english)) if (old[key] != null && JSON.stringify(value) !== JSON.stringify(old[key]) && catalog[key] != null) gaps.push({ language: locale, kind: 'stale', what: key });
    }
    for (const [key, value] of Object.entries(english)) {
      if (typeof value !== 'string' || typeof catalog[key] !== 'string') continue;
      const want = placeholders(value), have = placeholders(catalog[key]);
      if ([...want].some(name => !have.has(name)) || [...have].some(name => !want.has(name))) gaps.push({ language: locale, kind: 'placeholders', what: key });
    }
    gaps.push(...pluralGaps(locale, english, catalog));
  }
  const runtime = join(cwd, 'node_modules/@joeblew999/remy-ui/src/paraglide/runtime.js');
  if (existsSync(runtime)) {
    const { locales: platform } = await import(pathToFileURL(runtime).href) as { locales: readonly string[] };
    const listed = new Set(settings.locales);
    for (const locale of platform) if (!listed.has(locale)) gaps.push({ language: locale, kind: 'unlisted', what: '(the platform serves it)' });
    for (const locale of settings.locales) if (!platform.includes(locale)) gaps.push({ language: locale, kind: 'unserved', what: '(the platform does not serve it)' });
  }
  return { gaps, english: relative(cwd, englishFile), locales: settings.locales.length };
}

/**
 * Docs translations (Fumadocs) against English: per site (its i18n.json languages) each page's
 * <page>.<lang>.md(x) missing or stale, orphans; Fumadocs' own UI text (ui/<lang>.json) missing or
 * stale keys. Needs full git history: a shallow clone cannot tell what is stale.
 */
export function docsGaps(cwd = process.cwd()): { gaps: Gap[]; sites: number; shallow?: boolean } {
  const dir = process.env.I18N_DOCS_DIR ?? 'docs/content';
  const content = join(cwd, dir);
  const sites = existsSync(content) ? readdirSync(content, { withFileTypes: true }).filter(entry => entry.isDirectory() && existsSync(join(content, entry.name, 'i18n.json'))).map(entry => join(content, entry.name)) : [];
  if (!sites.length) return { gaps: [], sites: 0 };
  if (git(cwd, 'rev-parse', '--is-shallow-repository') !== 'false') return { gaps: [], sites: sites.length, shallow: true };
  const language = /\.[a-z]{2,3}(-[A-Za-z]{2,4})?\.mdx?$/;
  const files = (where: string) => (git(cwd, 'ls-files', '-co', '--exclude-standard', '--', relative(cwd, where)) ?? '').split('\n').filter(Boolean);
  const stale = (english: string, translation: string) => {
    const commit = git(cwd, 'log', '-1', '--format=%H', '--', translation);
    return !!commit && spawnSync('git', ['diff', '--quiet', commit, '--', english], { cwd }).status !== 0;
  };
  const gaps: Gap[] = [];
  const languages = new Set<string>();
  for (const site of sites) {
    const { defaultLanguage, languages: list } = readJson(join(site, 'i18n.json')) as { defaultLanguage: string; languages: string[] };
    const pages = files(site).filter(file => /\.mdx?$/.test(file));
    for (const lang of list.filter(lang => lang !== defaultLanguage)) {
      languages.add(lang);
      for (const english of pages.filter(file => !language.test(file))) {
        const translation = english.replace(/\.(mdx?)$/, `.${lang}.$1`);
        if (!existsSync(join(cwd, translation))) gaps.push({ language: lang, kind: 'missing', what: translation });
        else if (stale(english, translation)) gaps.push({ language: lang, kind: 'stale', what: translation });
      }
      for (const translation of pages.filter(file => file.endsWith(`.${lang}.md`) || file.endsWith(`.${lang}.mdx`))) {
        const english = translation.replace(new RegExp(`\\.${lang}\\.(mdx?)$`), '.$1');
        if (!existsSync(join(cwd, english))) gaps.push({ language: lang, kind: 'orphan', what: translation });
      }
    }
  }
  const uiEnglish = join(content, 'ui', 'en.json');
  if (existsSync(uiEnglish)) {
    const english = readJson(uiEnglish);
    for (const lang of [...languages].sort()) {
      const file = join(content, 'ui', `${lang}.json`);
      if (!existsSync(file)) { gaps.push({ language: lang, kind: 'missing', what: relative(cwd, file) }); continue; }
      const translation = readJson(file);
      for (const key of Object.keys(english)) if (!(key in translation)) gaps.push({ language: lang, kind: 'ui-missing', what: key });
      const commit = git(cwd, 'log', '-1', '--format=%H', '--', relative(cwd, file));
      const before = commit ? git(cwd, 'show', `${commit}:${relative(cwd, uiEnglish)}`) : undefined;
      if (before) {
        const old = JSON.parse(before) as Record<string, unknown>;
        for (const [key, value] of Object.entries(english)) if (old[key] != null && JSON.stringify(value) !== JSON.stringify(old[key])) gaps.push({ language: lang, kind: 'ui-stale', what: key });
      }
    }
  }
  return { gaps, sites: sites.length };
}

/** Every gap, both kinds, for the steps: nothing to translate when empty. */
export async function translationGaps(cwd = process.cwd()): Promise<Gap[]> {
  const messages = await messagesGaps(cwd);
  const docs = docsGaps(cwd);
  return [...messages.gaps, ...docs.gaps];
}

const summary = (gaps: Gap[]) => {
  const counts = new Map<string, number>();
  for (const gap of gaps) counts.set(`${gap.language} ${gap.kind}`, (counts.get(`${gap.language} ${gap.kind}`) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => `  ${key}: ${count}`).join('\n');
};

/** The messages check as a person or a translator reads it; true when clean. */
export async function checkMessages(list: boolean, cwd = process.cwd()): Promise<boolean> {
  const { gaps, english, locales } = await messagesGaps(cwd);
  if (!english) { console.log('Messages: no inlang project, nothing to check.'); return true; }
  if (!gaps.length) { console.log(`Messages: every catalog complete and current (${locales} locales).`); return true; }
  if (list) console.log(gaps.map(gapLine).join('\n'));
  else console.log(`Messages: gaps against ${english} (npx remy i18n check messages --list for every key):\n${summary(gaps)}`);
  return false;
}

/** The docs check the same way; true when clean. */
export function checkDocs(list: boolean, cwd = process.cwd()): boolean {
  const { gaps, sites, shallow } = docsGaps(cwd);
  if (!sites) { console.log(`Docs: no sites with an i18n.json under ${process.env.I18N_DOCS_DIR ?? 'docs/content'}, nothing to check.`); return true; }
  if (shallow) { console.log('Docs: needs full git history (a shallow clone cannot tell what is stale).'); process.exit(2); }
  if (!gaps.length) { console.log('Docs: every translation complete and current.'); return true; }
  if (list) console.log(gaps.map(gapLine).join('\n'));
  else console.log(`Docs: gaps (npx remy i18n check docs --list for every file):\n${summary(gaps)}`);
  return false;
}

/**
 * Both checks: exit 1 on a gap with I18N_STRICT (the translation step, the release gate), a WARNING and
 * exit 0 while coding (the check runs it on every change).
 */
export async function checkAll(strict = process.env.I18N_STRICT === '1', cwd = process.cwd()): Promise<boolean> {
  const messages = await checkMessages(false, cwd);
  const docs = checkDocs(false, cwd);
  if (messages && docs) return true;
  if (strict) return false;
  console.log('WARNING: translations are incomplete or stale; the next npm run dev:land translates them, on main.');
  return true;
}

export async function main(args: string[]): Promise<void> {
  const [command, which] = args;
  const list = args.includes('--list');
  if (command !== 'check') { console.error('remy i18n: check [messages|docs] [--list]'); process.exit(2); }
  const ok = which === 'messages' ? await checkMessages(list) : which === 'docs' ? checkDocs(list) : await checkAll();
  if (!ok) process.exit(1);
}
