// Translations, checked offline (`remy i18n check [messages|docs] [--list]`): read-only, no network, no
// git history, so the same answer on a Mac, in a cloud agent's container and in GitHub's shallow checkout.
// Each translation records what it was made from: a translated page a fingerprint of each English section
// (`translatedFrom` in its frontmatter), a catalog a fingerprint of each English message
// (`translated-from/<lang>.json` beside it). A translation is stale where its record and the English
// differ, and the record names exactly which sections or keys (owner, 2026-10-17: translating took ages;
// it used to judge staleness from git history, which needed the whole history and one writer on main).
// A gap is one line, "<language> <kind> <what>", which the translators read with --list; without it,
// counts per language and kind. Exit 1 on any gap with --strict, a warning otherwise (a release refuses gaps itself).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parts } from './page.ts';
import type { Subcommands } from './commands.ts';
import { docsContent } from './config.ts';

export type Gap = { language: string; kind: string; what: string };
const gapLine = (gap: Gap) => `${gap.language} ${gap.kind} ${gap.what}`;

/** git's list of files (never its history: this works in a shallow checkout). */
function git(cwd: string, ...args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
}
const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

// --- What a translation was made from ---------------------------------------------------------------------

/** A short fingerprint of an English text or message: a translation made from it records this. */
export const print = (value: unknown): string =>
  createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex')
    .slice(0, 8);

/**
 * A page split at its "## " and "### " headings, outside fenced code: the part before the first heading
 * (the frontmatter and the introduction), then one part per section, each starting with its heading. Both
 * levels: a page of "###" sections alone (tasks.md) was otherwise one section, translated whole.
 */
export function sections(text: string): string[] {
  const found: string[] = [];
  let current: string[] = [];
  let fence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && /^###? /.test(line)) {
      found.push(current.join('\n'));
      current = [];
    }
    current.push(line);
  }
  found.push(current.join('\n'));
  return found;
}

/**
 * A translated page with some sections replaced by new translations (by index), and the record dropped:
 * each new section keeps the English section's ending, so the blank line before the next heading stays.
 */
export function splice(english: string, translation: string, fresh: Map<number, string>): string {
  const englishParts = sections(english),
    translatedParts = sections(withoutRecord(translation));
  for (const [index, text] of fresh)
    translatedParts[index] = text.replace(/\n+$/, '') + (/\n*$/.exec(englishParts[index] ?? '')?.[0] ?? '');
  return translatedParts.join('\n');
}

/** What a translation of this English page records: one fingerprint per section. */
/**
 * A section as its words, not its layout: runs of spaces collapsed and a table's padding gone, so the formatter
 * (vp fmt, which lines up a table's columns) never makes a translation look stale. Owner, 2026-10-17: Vite+ is
 * right; its formatting is applied everywhere, and spacing is not a change to what a page says.
 */
const words = (section: string): string =>
  section
    .replace(/^[ \t]*\|.*\|[ \t]*$/gm, (row) => row.replace(/[ \t]*\|[ \t]*/g, '|').replace(/-{3,}/g, '---'))
    .replace(/[ \t]+/g, ' ')
    .replace(/ +$/gm, '');
export const pagePrints = (english: string): string[] => sections(english).map((section) => print(words(section)));
/** Each section's fingerprint as records made before 2026-10-17 took it, layout included: still accepted, so no page went stale. */
const layoutPrints = (english: string): string[] => sections(english).map(print);
/** Whether a recorded fingerprint is section `index`'s, today's or the older kind. */
const same = (recorded: string | undefined, now: string[], layout: string[], index: number) =>
  recorded === now[index] || recorded === layout[index];

const recordLine = /^translatedFrom:.*\r?\n/m;
/** The fingerprints a translated page records, or undefined when it records none. */
export function madeFrom(page: string): string[] | undefined {
  const value = parts(page)?.fields.translatedFrom;
  return value ? value.split(/\s+/) : undefined;
}
/** The page without its record: what the translator sees and returns. */
export const withoutRecord = (page: string): string => page.replace(recordLine, '');
/** The page recording these fingerprints, as the last line of its frontmatter. */
export function withRecord(page: string, prints: string[]): string {
  const bare = withoutRecord(page);
  const end = /^---\r?\n[\s\S]*?\r?\n(?=---[ \t]*(?:\r?\n|$))/.exec(bare);
  return end
    ? bare.slice(0, end[0].length) + `translatedFrom: "${prints.join(' ')}"\n` + bare.slice(end[0].length)
    : bare;
}

/**
 * Which sections of a translated page to translate again: the indexes whose English fingerprint differs
 * from the one recorded. Undefined when the page cannot be patched section by section (no record, or the
 * English or the translation has a different number of sections than the record): then the whole page.
 */
export function changedSections(english: string, translation: string): number[] | undefined {
  const recorded = madeFrom(translation),
    now = pagePrints(english),
    layout = layoutPrints(english);
  if (!recorded || recorded.length !== now.length || sections(withoutRecord(translation)).length !== now.length)
    return undefined;
  return now.flatMap((_, index) => (same(recorded[index], now, layout, index) ? [] : [index]));
}

/**
 * A docs menu's words (meta.json): its title, and the labels of its separators ("---Help---") and links
 * ("[Text](url)"), each keyed by where it sits. Pages translate as pages; a menu was never translated, so the
 * Spanish sidebar, its llms.txt headings and its site title stayed English (2026-10-17).
 */
export function menuWords(meta: { title?: string; pages?: string[] }): Record<string, string> {
  const words: Record<string, string> = {};
  if (meta.title) words.title = meta.title;
  (meta.pages ?? []).forEach((entry, index) => {
    const label = /^---(.+)---$/.exec(entry)?.[1] ?? /^\[([^\]]+)\]\(.+\)$/.exec(entry)?.[1];
    if (label) words[`pages.${index}`] = label;
  });
  return words;
}

/** The menu in another language (meta.<lang>.json, which Fumadocs reads): the English menu with the translated words, and the record of what it was made from. */
export function menuIn(
  meta: { title?: string; pages?: string[] } & Record<string, unknown>,
  words: Record<string, string>,
): Record<string, unknown> {
  const pages = (meta.pages ?? []).map((entry, index) => {
    const label = words[`pages.${index}`];
    if (!label) return entry;
    if (/^---.+---$/.test(entry)) return `---${label}---`;
    return entry.replace(/^\[[^\]]+\]/, `[${label}]`);
  });
  return {
    ...meta,
    ...(meta.title && words.title ? { title: words.title } : {}),
    pages,
    translatedFrom: print(menuWords(meta)),
  };
}

/** A catalog's record: `translated-from/<lang>.json` in the catalog's folder, key to fingerprint. */
export const recordFile = (catalog: string): string =>
  join(dirname(catalog), 'translated-from', catalog.slice(dirname(catalog).length + 1));
/** The record of a catalog, empty when it has none. */
export const readRecord = (catalog: string): Record<string, string> =>
  existsSync(recordFile(catalog)) ? (readJson(recordFile(catalog)) as Record<string, string>) : {};
/** The keys of a catalog whose English differs from what the record says it was made from (or that it has no record of). */
export function staleKeys(
  english: Record<string, unknown>,
  catalog: Record<string, unknown>,
  record: Record<string, string>,
): string[] {
  return Object.keys(english).filter((key) => catalog[key] != null && record[key] !== print(english[key]));
}

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
      const declaration = declarations.find((line) => new RegExp(`^local ${selector} = \\w+: plural\\b`).test(line));
      if (!declaration) continue;
      const rules = new Intl.PluralRules(locale, { type: /type=ordinal/.test(declaration) ? 'ordinal' : 'cardinal' });
      const have = new Set(
        Object.keys(match)
          .flatMap((variant) => variant.split(/\s+/))
          .filter((part) => part.startsWith(`${selector}=`))
          .map((part) => part.slice(selector.length + 1).replace(/^\*$/, 'other')),
      );
      const lacking = [...new Set(numbers.map((n) => rules.select(n)))].filter((category) => !have.has(category));
      if (lacking.length) gaps.push({ language: locale, kind: 'plural', what: `${key} ${lacking.join(',')}` });
    }
  }
  return gaps;
}

/**
 * UI messages (Paraglide catalogs) against English: missing catalogs and keys, extra keys, keys whose
 * English differs from what the catalog's record says it was made from, placeholders lost or invented, plural categories,
 * and the same languages as the platform (every page is served in each language the platform
 * routes, so a catalog lists exactly those).
 */
export async function messagesGaps(cwd = process.cwd()): Promise<{ gaps: Gap[]; english?: string; locales: number }> {
  const inlang = git(cwd, 'ls-files', '--', '*project.inlang/settings.json')
    ?.split('\n')
    .filter(Boolean)[0]
    ?.replace(/\/settings\.json$/, '');
  const settingsFile = inlang ? join(cwd, inlang, 'settings.json') : undefined;
  if (!settingsFile || !existsSync(settingsFile)) return { gaps: [], locales: 0 };
  const settings = readJson(settingsFile) as {
    baseLocale: string;
    locales: string[];
    'plugin.inlang.messageFormat'?: { pathPattern: string };
  };
  const pattern = settings['plugin.inlang.messageFormat']?.pathPattern ?? './messages/{locale}.json';
  // The pattern is relative to the folder that holds project.inlang (inlang's own rule).
  const fileOf = (locale: string) => join(dirname(dirname(settingsFile)), pattern.replace('{locale}', locale));
  const englishFile = fileOf(settings.baseLocale);
  const english = readJson(englishFile);
  const gaps: Gap[] = [];
  for (const locale of settings.locales.filter((locale) => locale !== settings.baseLocale)) {
    const file = fileOf(locale);
    if (!existsSync(file)) {
      gaps.push({ language: locale, kind: 'catalog', what: relative(cwd, file) });
      continue;
    }
    const catalog = readJson(file);
    for (const key of Object.keys(english))
      if (!(key in catalog)) gaps.push({ language: locale, kind: 'missing', what: key });
    for (const key of Object.keys(catalog))
      if (!(key in english)) gaps.push({ language: locale, kind: 'extra', what: key });
    for (const key of staleKeys(english, catalog, readRecord(file)))
      gaps.push({ language: locale, kind: 'stale', what: key });
    for (const [key, value] of Object.entries(english)) {
      if (typeof value !== 'string' || typeof catalog[key] !== 'string') continue;
      const want = placeholders(value),
        have = placeholders(catalog[key]);
      if ([...want].some((name) => !have.has(name)) || [...have].some((name) => !want.has(name)))
        gaps.push({ language: locale, kind: 'placeholders', what: key });
    }
    gaps.push(...pluralGaps(locale, english, catalog));
  }
  const runtime = join(cwd, 'node_modules/@joeblew999/remy-ui/src/paraglide/runtime.js');
  if (existsSync(runtime)) {
    const { locales: platform } = (await import(pathToFileURL(runtime).href)) as { locales: readonly string[] };
    const listed = new Set(settings.locales);
    for (const locale of platform)
      if (!listed.has(locale)) gaps.push({ language: locale, kind: 'unlisted', what: '(the platform serves it)' });
    for (const locale of settings.locales)
      if (!platform.includes(locale))
        gaps.push({ language: locale, kind: 'unserved', what: '(the platform does not serve it)' });
  }
  return { gaps, english: relative(cwd, englishFile), locales: settings.locales.length };
}

/**
 * Docs translations (Fumadocs) against English: per site (its i18n.json languages) each page's
 * <page>.<lang>.md(x) missing or stale, orphans; Fumadocs' own UI text (ui/<lang>.json) missing or
 * stale keys.
 */
export function docsGaps(cwd = process.cwd()): { gaps: Gap[]; sites: number } {
  const content = join(cwd, docsContent(cwd));
  const sites = existsSync(content)
    ? readdirSync(content, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(content, entry.name, 'i18n.json')))
        .map((entry) => join(content, entry.name))
    : [];
  if (!sites.length) return { gaps: [], sites: 0 };
  const language = /\.[a-z]{2,3}(-[A-Za-z]{2,4})?\.mdx?$/;
  // What git knows that is there now: a page deleted or renamed but not yet committed is still in git's index, and
  // counting it made a renamed page both missing and an orphan (2026-10-17, vp run check renaming .mdx to .md).
  const files = (where: string) =>
    (git(cwd, 'ls-files', '-co', '--exclude-standard', '--', relative(cwd, where)) ?? '')
      .split('\n')
      .filter(Boolean)
      .filter((file) => existsSync(join(cwd, file)));
  const stale = (english: string, translation: string) => {
    const recorded = madeFrom(readFileSync(join(cwd, translation), 'utf8'));
    const text = readFileSync(join(cwd, english), 'utf8'),
      now = pagePrints(text),
      layout = layoutPrints(text);
    return (
      !recorded || recorded.length !== now.length || !now.every((_, index) => same(recorded[index], now, layout, index))
    );
  };
  const gaps: Gap[] = [];
  const languages = new Set<string>();
  for (const site of sites) {
    const { defaultLanguage, languages: list } = readJson(join(site, 'i18n.json')) as {
      defaultLanguage: string;
      languages: string[];
    };
    const pages = files(site).filter((file) => /\.mdx?$/.test(file));
    for (const lang of list.filter((lang) => lang !== defaultLanguage)) {
      languages.add(lang);
      for (const english of pages.filter((file) => !language.test(file))) {
        const translation = english.replace(/\.(mdx?)$/, `.${lang}.$1`);
        if (!existsSync(join(cwd, translation))) gaps.push({ language: lang, kind: 'missing', what: translation });
        else if (stale(english, translation)) gaps.push({ language: lang, kind: 'stale', what: translation });
      }
      // The site's menu (meta.json) in this language: missing, or made from other English words.
      const menu = join(site, 'meta.json');
      if (existsSync(menu)) {
        const translated = join(site, `meta.${lang}.json`);
        const made = existsSync(translated) ? (readJson(translated).translatedFrom as string | undefined) : undefined;
        if (made !== print(menuWords(readJson(menu) as { title?: string; pages?: string[] })))
          gaps.push({ language: lang, kind: 'menu', what: relative(cwd, translated) });
      }
      for (const translation of pages.filter((file) => file.endsWith(`.${lang}.md`) || file.endsWith(`.${lang}.mdx`))) {
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
      if (!existsSync(file)) {
        gaps.push({ language: lang, kind: 'missing', what: relative(cwd, file) });
        continue;
      }
      const translation = readJson(file);
      for (const key of Object.keys(english))
        if (!(key in translation)) gaps.push({ language: lang, kind: 'ui-missing', what: key });
      for (const key of staleKeys(english, translation, readRecord(file)))
        gaps.push({ language: lang, kind: 'ui-stale', what: key });
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
  for (const gap of gaps)
    counts.set(`${gap.language} ${gap.kind}`, (counts.get(`${gap.language} ${gap.kind}`) ?? 0) + 1);
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `  ${key}: ${count}`)
    .join('\n');
};

/** The messages check as a person or a translator reads it; true when clean. */
export async function checkMessages(list: boolean, cwd = process.cwd()): Promise<boolean> {
  const { gaps, english, locales } = await messagesGaps(cwd);
  if (!english) {
    console.log('Messages: no inlang project, nothing to check.');
    return true;
  }
  if (!gaps.length) {
    console.log(`Messages: every catalog complete and current (${locales} locales).`);
    return true;
  }
  if (list) console.log(gaps.map(gapLine).join('\n'));
  else
    console.log(
      `Messages: gaps against ${english} (npx remy i18n check messages --list for every key):\n${summary(gaps)}`,
    );
  return false;
}

/** The docs check the same way; true when clean. */
export function checkDocs(list: boolean, cwd = process.cwd()): boolean {
  const { gaps, sites } = docsGaps(cwd);
  if (!sites) {
    console.log(`Docs: no sites with an i18n.json under ${docsContent()}, nothing to check.`);
    return true;
  }
  if (!gaps.length) {
    console.log('Docs: every translation complete and current.');
    return true;
  }
  if (list) console.log(gaps.map(gapLine).join('\n'));
  else console.log(`Docs: gaps (npx remy i18n check docs --list for every file):\n${summary(gaps)}`);
  return false;
}

/**
 * Both checks: a WARNING and exit 0 while coding (the check runs it on every change, and an English edit is stale
 * until its landing translates it); exit 1 on a gap with --strict. A release refuses gaps itself (remy release check).
 */
export async function checkAll(strict = false, cwd = process.cwd()): Promise<boolean> {
  const messages = await checkMessages(false, cwd);
  const docs = checkDocs(false, cwd);
  if (messages && docs) return true;
  if (strict) return false;
  console.log('WARNING: translations are incomplete or stale; vp run land translates them, in this change.');
  return true;
}

export const what =
  "translations: check [messages|docs] [--list] (offline, read-only), translate [messages|docs] (the machine's Claude; vp run land runs it in the change)";
/** The subcommands, for remy help and the Commands page; main dispatches on the same two words. */
export const commands: Subcommands = {
  check: {
    what: '[messages|docs] [--list] [--strict]: the offline checks, read-only, no git history: a warning (exit 0) while coding and in vp run ci, exit 1 with --strict; --list prints one line per gap',
    run: (rest) => main(['check', ...rest]),
  },
  translate: {
    what: "[messages|docs] [files…]: what the checks list, by the machine's Claude (--model, default sonnet; --jobs at a time, default 8): only the changed sections and keys, with their records; named translation files redone in full; vp run land runs it in the change",
    run: (rest) => main(['translate', ...rest]),
  },
};
export async function main(args: string[]): Promise<void> {
  const [command, which, ...rest] = args;
  const list = args.includes('--list');
  if (command === 'translate') {
    const { translate } = await import('./translate.ts');
    return translate([which, ...rest].filter((part): part is string => part !== undefined));
  }
  if (command !== 'check') {
    console.error('remy i18n: check [messages|docs] [--list] | translate [messages|docs] [files...]');
    process.exit(2);
  }
  const ok =
    which === 'messages'
      ? await checkMessages(list)
      : which === 'docs'
        ? checkDocs(list)
        : await checkAll(args.includes('--strict'));
  if (!ok) process.exit(1);
}
