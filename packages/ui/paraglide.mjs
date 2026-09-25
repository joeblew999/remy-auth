// One source for the Paraglide compiler options: the Vite plugin and `mise run ui:generate`
// both use it, so the generated runtime is identical everywhere.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from '@inlang/paraglide-js';

const here = new URL('.', import.meta.url);
const locales = JSON.parse(readFileSync(new URL('project.inlang/settings.json', here), 'utf8')).locales;

export const options = {
  project: fileURLToPath(new URL('project.inlang', here)),
  outdir: fileURLToPath(new URL('src/paraglide', here)),
  emitTsDeclarations: true,
  emitGitIgnore: false,
  // A locale in the URL wins; otherwise a remembered choice, then Accept-Language or the
  // browser's languages, then the base locale. Paraglide's middleware and setLocale do the rest.
  // custom-chinese (src/matching.ts) reaches zh-TW from Traditional Chinese tags such as
  // zh-Hant-HK, which preferredLanguage's whole-tag-then-language match cannot.
  strategy: ['url', 'cookie', 'custom-chinese', 'preferredLanguage', 'baseLocale'],
  // Every locale, including the base locale, lives under its own prefix (/en, /es, /ar).
  urlPatterns: [{
    pattern: ':protocol://:domain(.*)::port?/:path(.*)?',
    localized: locales.map(locale => [locale, `:protocol://:domain(.*)::port?/${locale}/:path(.*)?`]),
  }],
  trailingSlash: 'never',
  // The contract API (/api, .plans/openapi-contracts.md) is not a page: no locale in its URLs, no
  // redirect, no cookie. A call answers in the language its Accept-Language asks for (the app's
  // client sends the page's language), else the base locale.
  routeStrategies: [{ match: '/api/:path(.*)?', strategy: ['preferredLanguage', 'baseLocale'] }],
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await compile(options);
