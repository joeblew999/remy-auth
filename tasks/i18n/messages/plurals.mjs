// Plural categories per locale, which no upstream tool checks (.plans/translation-pipeline.md): for each
// Paraglide plural selector (`local X = n: plural`, optionally `type=ordinal`), the categories
// Intl.PluralRules gives the locale for 0 to 1000 and 1.5 must each have a variant; `*` covers only
// `other`. Prints "<locale> plural <key> <missing,categories>" per gap. Usage: plurals.mjs <en.json> <locale>=<file>...
import { readFileSync } from 'node:fs';

const [english, ...targets] = process.argv.slice(2);
const base = JSON.parse(readFileSync(english, 'utf8'));
const numbers = [...Array(1001).keys(), 1.5];
for (const target of targets) {
  const [locale, file] = target.split('=');
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(catalog)) {
    if (!Array.isArray(value) || !Array.isArray(base[key])) continue;
    const { declarations = [], selectors = [], match = {} } = value[0] ?? {};
    for (const selector of selectors) {
      const declaration = declarations.find(line => new RegExp(`^local ${selector} = \\w+: plural\\b`).test(line));
      if (!declaration) continue;
      const rules = new Intl.PluralRules(locale, { type: /type=ordinal/.test(declaration) ? 'ordinal' : 'cardinal' });
      const have = new Set(Object.keys(match).flatMap(variant => variant.split(/\s+/)).filter(part => part.startsWith(`${selector}=`))
        .map(part => part.slice(selector.length + 1).replace(/^\*$/, 'other')));
      const lacking = [...new Set(numbers.map(n => rules.select(n)))].filter(category => !have.has(category));
      if (lacking.length) console.log(`${locale} plural ${key} ${lacking.join(',')}`);
    }
  }
}
