// Translation status for any app that includes these tasks (mise i18n:status, i18n:check, i18n:translate).
// English is the source; translations follow it. One layout, the same in every app:
//
//   docs      Fumadocs' layout (content/docs, or I18N_DOCS_DIR): the English page <name>.md, its
//             translation beside it, <name>.<locale>.md, whose line under the frontmatter records the
//             English version it was translated from:
//             <!-- translated-from: <English path> @ <git blob sha of the English file> -->
//             A locale takes part in the docs by having any translated page; its missing pages show in
//             English (Fumadocs' fallbackLanguage).
//   catalogs  every inlang project in the repository (<dir>/project.inlang/settings.json): its
//             locales, base locale and the message-format plugin's pathPattern, read from inlang's
//             own settings. Each locale's catalog must hold the base catalog's keys, no others, with
//             the same placeholders.
//
// A blob sha is content-based: the same English text has the same sha on every branch, so merges
// never disagree about it, and `git diff <recorded> <current>` is exactly what changed since.
// Nothing here calls a model: i18n:translate prints the work, a translation agent does it.
//
//   status [--json]              the report; always exits 0
//   check                        the report's summary; with I18N_STRICT=1 any problem exits 1
//   translate [locale]           what to translate: English diffs for stale docs, missing keys with values
//   translate --mark <file>...   record the current English version in translated docs files
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const docsDir = process.env.I18N_DOCS_DIR ?? 'content/docs';
/** The frontmatter block, then the provenance line (groups: frontmatter, English path, sha). */
const provenance = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)?<!-- translated-from: (\S+) @ ([0-9a-f]{40,64}) -->\r?\n/;
const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
/** A translation's name: <name>.<locale>.md. */
const translated = /^(.+)\.([a-z]{2,3}(?:-[A-Za-z]{2,4})?)\.(mdx?)$/;
const translationOf = (file, locale) => file.replace(/\.(mdx?)$/, `.${locale}.$1`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const blobOf = (file, write = false) => git('hash-object', ...(write ? ['-w'] : []), '--', file).trim();
const hasObject = sha => { try { git('cat-file', '-e', sha); return true; } catch { return false; } };
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const sorted = items => [...items].sort();

/** Heading levels outside code fences: a translation marked current keeps its English file's. */
const levels = text => {
  let fence;
  return text.split('\n').flatMap(line => {
    const opens = line.match(/^\s*(```+|~~~+)/);
    if (opens) { if (!fence) fence = opens[1]; else if (line.trim().startsWith(fence)) fence = undefined; return []; }
    const heading = !fence && /^(#{1,6})\s/.exec(line);
    return heading ? [heading[1].length] : [];
  });
};

const walk = dir => readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => relative(dir, join(entry.parentPath, entry.name)).split('\\').join('/'));

async function docsReport() {
  const files = existsSync(docsDir) ? walk(docsDir).filter(file => /\.mdx?$/.test(file)).map(file => `${docsDir}/${file}`) : [];
  const english = sorted(files.filter(file => !translated.test(file)));
  const locales = sorted(new Set(files.flatMap(file => translated.exec(file)?.[2] ?? [])));
  const report = { source: docsDir, english, locales: {} };
  if (!locales.length) return report;
  const blobs = new Map(english.map(file => [file, blobOf(file)]));
  for (const locale of locales) {
    const entry = report.locales[locale] = { current: [], missing: [], stale: [], unmarked: [], headings: [], orphans: [] };
    for (const file of english) {
      const translation = translationOf(file, locale);
      if (!existsSync(translation)) { entry.missing.push({ file, translation }); continue; }
      const text = readFileSync(translation, 'utf8');
      const mark = provenance.exec(text);
      if (!mark || mark[2] !== file) { entry.unmarked.push({ file, translation }); continue; }
      const current = blobs.get(file);
      if (mark[3] !== current) { entry.stale.push({ file, translation, recorded: mark[3], current }); continue; }
      const want = levels(readFileSync(file, 'utf8')), have = levels(text);
      if (want.join() !== have.join()) entry.headings.push({ file, translation, english: want.length, translated: have.length });
      else entry.current.push(file);
    }
    entry.orphans = files.filter(file => translated.exec(file)?.[2] === locale && !english.includes(`${translated.exec(file)[1]}.${translated.exec(file)[3]}`))
      .map(translation => ({ file: `${translated.exec(translation)[1]}.${translated.exec(translation)[3]}`, translation }));
  }
  return report;
}

/** A message's parameters: {name} in a plain string; for a variant message its inputs and any undeclared name its variants use. */
const params = message => {
  const names = text => [...String(text).matchAll(/\{\s*([A-Za-z_$][\w$-]*)\s*\}/g)].map(m => m[1]);
  if (typeof message === 'string') return sorted(new Set(names(message)));
  const found = new Set();
  for (const variant of [message].flat()) {
    const declared = new Set();
    for (const line of variant?.declarations ?? []) {
      const input = line.match(/^\s*input\s+(\S+)/), local = line.match(/^\s*local\s+(\S+)/);
      if (input) found.add(input[1]);
      if (local) declared.add(local[1]);
    }
    for (const text of Object.values(variant?.match ?? {})) for (const name of names(text)) if (!declared.has(name)) found.add(name);
  }
  return sorted(found);
};

function catalogsReport() {
  const settings = git('ls-files', '--cached', '--others', '--exclude-standard', '--', '*project.inlang/settings.json')
    .split('\n').filter(Boolean).filter(file => existsSync(file));
  return sorted(new Set(settings)).map(file => {
    const config = readJson(file);
    const project = dirname(file);
    const pattern = config['plugin.inlang.messageFormat']?.pathPattern;
    const base = config.baseLocale;
    if (!pattern) return { project, base, note: 'no plugin.inlang.messageFormat pathPattern: not checked', locales: {} };
    const pathOf = locale => relative('.', resolve(dirname(project), pattern.replaceAll('{locale}', locale))).split('\\').join('/');
    const source = readJson(pathOf(base));
    const keys = Object.keys(source).filter(key => !key.startsWith('$'));
    const report = { project, base, file: pathOf(base), keys: keys.length, locales: {} };
    for (const locale of config.locales.filter(locale => locale !== base)) {
      const path = pathOf(locale);
      if (!existsSync(path)) { report.locales[locale] = { file: path, absent: true, missing: keys.map(key => ({ key, english: source[key] })), extra: [], placeholders: [] }; continue; }
      const catalog = readJson(path);
      const own = Object.keys(catalog).filter(key => !key.startsWith('$'));
      const mismatched = keys.filter(key => key in catalog).flatMap(key => {
        const english = params(source[key]), translated = params(catalog[key]);
        return english.join() === translated.join() ? [] : [{ key, english, translated, englishText: source[key], translatedText: catalog[key] }];
      });
      report.locales[locale] = {
        file: path,
        missing: keys.filter(key => !(key in catalog)).map(key => ({ key, english: source[key] })),
        extra: own.filter(key => !(key in source)),
        placeholders: mismatched,
      };
    }
    return report;
  });
}

const docsProblems = entry => entry.missing.length + entry.stale.length + entry.unmarked.length + entry.headings.length + entry.orphans.length;
const catalogProblems = entry => entry.missing.length + entry.extra.length + entry.placeholders.length;

async function report() {
  const docs = await docsReport(), catalogs = catalogsReport();
  const problems = Object.values(docs.locales).reduce((sum, entry) => sum + docsProblems(entry), 0)
    + catalogs.reduce((sum, catalog) => sum + Object.values(catalog.locales).reduce((n, entry) => n + catalogProblems(entry), 0), 0);
  const nothing = !Object.keys(docs.locales).length && !catalogs.length;
  return { docs, catalogs, problems, nothing };
}

function print({ docs, catalogs, problems, nothing }) {
  if (nothing) { console.log('Translations: nothing to translate (no docs/i18n/<locale>/ folders and no project.inlang catalogs).'); return; }
  const lines = [];
  if (Object.keys(docs.locales).length) {
    lines.push(`Docs (${docs.source}, <name>.<locale>.md beside <name>.md, ${docs.english.length} English files):`);
    for (const [locale, entry] of Object.entries(docs.locales)) {
      const parts = [`${entry.current.length} current`];
      for (const name of ['stale', 'missing', 'unmarked', 'headings', 'orphans']) if (entry[name].length) parts.push(`${entry[name].length} ${name}`);
      lines.push(`  ${locale.padEnd(6)} ${parts.join(', ')}`);
      for (const item of entry.stale) lines.push(`         stale     ${item.translation} (English ${item.file} changed since ${item.recorded.slice(0, 8)})`);
      for (const item of entry.missing) lines.push(`         missing   ${item.translation}`);
      for (const item of entry.unmarked) lines.push(`         unmarked  ${item.translation} (no translated-from line for ${item.file})`);
      for (const item of entry.headings) lines.push(`         headings  ${item.translation}: ${item.translated} headings, ${item.file} has ${item.english}`);
      for (const item of entry.orphans) lines.push(`         orphan    ${item.translation} (no English ${item.file})`);
    }
  } else lines.push(`Docs: no translated pages in ${docsDir}.`);
  if (!catalogs.length) lines.push('UI catalogs: no project.inlang in this repository.');
  for (const catalog of catalogs) {
    if (catalog.note) { lines.push(`UI catalogs (${catalog.project}): ${catalog.note}`); continue; }
    lines.push(`UI catalogs (${catalog.project}, base ${catalog.base}, ${catalog.keys} keys):`);
    for (const [locale, entry] of Object.entries(catalog.locales)) {
      const parts = [];
      if (entry.absent) parts.push(`no file ${entry.file}`);
      if (entry.missing.length) parts.push(`${entry.missing.length} missing`);
      if (entry.extra.length) parts.push(`${entry.extra.length} extra`);
      if (entry.placeholders.length) parts.push(`${entry.placeholders.length} placeholder mismatches`);
      lines.push(`  ${locale.padEnd(6)} ${parts.length ? parts.join(', ') : 'ok'}`);
      if (entry.missing.length && !entry.absent) lines.push(`         missing   ${entry.missing.map(item => item.key).join(', ')}`);
      if (entry.extra.length) lines.push(`         extra     ${entry.extra.join(', ')}`);
      for (const item of entry.placeholders) lines.push(`         {…}       ${item.key}: English {${item.english.join(', ')}}, ${locale} {${item.translated.join(', ')}}`);
    }
  }
  lines.push(problems ? `${problems} to translate: mise run i18n:translate prints the work.` : 'Everything is translated and current.');
  console.log(lines.join('\n'));
}

function translate(result, only) {
  const { docs, catalogs } = result;
  if (result.nothing) { console.log('Nothing to translate.'); return; }
  const out = [];
  for (const [locale, entry] of Object.entries(docs.locales)) {
    if (only && locale !== only) continue;
    for (const item of entry.missing) out.push(`## ${locale}: translate ${item.file} into ${item.translation} (new file), then mise run i18n:translate -- --mark ${item.translation}\n`);
    for (const item of entry.unmarked) out.push(`## ${locale}: ${item.translation} has no translated-from line: compare it with the whole of ${item.file}, bring it in line, then mise run i18n:translate -- --mark ${item.translation}\n`);
    for (const item of entry.stale) {
      // The English file may be uncommitted: store its version so the diff can reach it.
      blobOf(item.file, true);
      out.push(`## ${locale}: ${item.translation} is behind ${item.file}. Translate this English change, then mise run i18n:translate -- --mark ${item.translation}`);
      out.push(hasObject(item.recorded)
        ? git('diff', '--no-color', '--no-ext-diff', item.recorded, item.current).replaceAll(`a/${item.recorded}`, `a/${item.file}`).replaceAll(`b/${item.current}`, `b/${item.file}`)
        : `(the recorded English version ${item.recorded} is not in this repository: compare against the whole of ${item.file})\n`);
    }
    for (const item of entry.headings) out.push(`## ${locale}: ${item.translation} is marked current but has ${item.translated} headings, ${item.file} has ${item.english}: finish the translation\n`);
    for (const item of entry.orphans) out.push(`## ${locale}: ${item.translation} has no English ${item.file}: delete it, or move it with its English file\n`);
  }
  for (const catalog of catalogs) for (const [locale, entry] of Object.entries(catalog.locales)) {
    if (only && locale !== only) continue;
    if (entry.missing.length) {
      out.push(`## ${locale}: add these keys to ${entry.file}, translated from ${catalog.file}:`);
      out.push(JSON.stringify(Object.fromEntries(entry.missing.map(item => [item.key, item.english])), null, 2) + '\n');
    }
    if (entry.extra.length) out.push(`## ${locale}: remove from ${entry.file} (not in ${catalog.file}): ${entry.extra.join(', ')}\n`);
    for (const item of entry.placeholders) out.push(`## ${locale}: ${entry.file} "${item.key}" must use {${item.english.join(', ')}}, as English does:\n  en: ${JSON.stringify(item.englishText)}\n  ${locale}: ${JSON.stringify(item.translatedText)}\n`);
  }
  console.log(out.length ? out.join('\n') : `Nothing to translate${only ? ` for ${only}` : ''}.`);
}

/** Record the current English version in each translated docs file: its first line. */
function mark(files) {
  if (!files.length) throw new Error(`--mark needs the translated files, e.g. ${docsDir}/index.es.md`);
  for (const translation of files) {
    const match = translated.exec(translation.split('\\').join('/'));
    if (!match) throw new Error(`${translation} is not a translation (<name>.<locale>.md)`);
    const file = `${match[1]}.${match[3]}`;
    if (!existsSync(file)) throw new Error(`${translation}: no English ${file}`);
    // -w keeps the English version in the object store, so a later diff from it works here.
    const sha = blobOf(file, true);
    const text = readFileSync(translation, 'utf8').replace(provenance, (_, front = '') => front);
    const front = frontmatter.exec(text)?.[0] ?? '';
    writeFileSync(translation, `${front}<!-- translated-from: ${file} @ ${sha} -->\n${text.slice(front.length)}`);
    console.log(`${translation}: translated from ${file} @ ${sha}`);
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'translate' && args[0] === '--mark') mark(args.slice(1));
else {
  const result = await report();
  if (command === 'status') {
    if (args.includes('--json')) console.log(JSON.stringify(result, null, 2)); else print(result);
  } else if (command === 'check') {
    const strict = process.env.I18N_STRICT === '1';
    if (result.nothing) console.log('Translations: nothing to translate.');
    else if (!result.problems) console.log('Translations: everything translated and current.');
    else {
      print(result);
      console.log(strict
        ? `ERROR: ${result.problems} translations missing or stale; a release needs them all (mise run i18n:translate).`
        : `WARNING: ${result.problems} translations missing or stale (a warning while coding; a release refuses them).`);
      if (strict) process.exitCode = 1;
    }
  } else if (command === 'translate') translate(result, args.find(arg => !arg.startsWith('-')));
  else { console.error('usage: i18n.mjs status [--json] | check | translate [locale] | translate --mark <file>...'); process.exitCode = 2; }
}
