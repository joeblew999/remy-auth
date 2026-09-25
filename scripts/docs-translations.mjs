// Tier 0 guard (mise project:check): every translation in docs/i18n/<locale>/ keeps its English file's
// headings, same number and levels, so edits to the English docs cannot leave a translation behind
// unseen (its heading ids and links would break). Code blocks are skipped. Fails naming each file.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { docsI18nDir, docsTable, docsTranslationFile } from '../src/docs/table.js';

const levels = file => {
  let fenced = false;
  return readFileSync(file, 'utf8').split('\n').flatMap(line => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced && /^(#{1,6})\s/.exec(line);
    return heading ? [heading[1].length] : [];
  });
};
const problems = [];
for (const locale of existsSync(docsI18nDir) ? readdirSync(docsI18nDir) : []) for (const row of docsTable) {
  const translated = docsTranslationFile(row.file, locale);
  if (!existsSync(translated)) continue;
  const english = levels(row.file), other = levels(translated);
  if (english.join() !== other.join()) problems.push(`${translated}: ${other.length} headings (${other.join(' ')}), ${row.file} has ${english.length} (${english.join(' ')}): translate the change`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Docs translations keep their English headings.');
