import { loader, llms } from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { openapi } from './openapi';
import { defineI18n } from 'fumadocs-core/i18n';
import { createFromSource } from 'fumadocs-core/search/server';
import usersI18n from '../../content/users/i18n.json' with { type: 'json' };
import devI18n from '../../content/dev/i18n.json' with { type: 'json' };
import { devDocs, usersDocs, type SiteName } from './collections';

// The two docs sites on the server (.plans/docs-for-consumers.md, "Fumadocs fully"), each as Fumadocs'
// TanStack Start template builds one: a loader, its llms output and its search. Each site's languages
// come from its own i18n.json (content/<site>/i18n.json), the one list the loader and the translation
// tasks read. URLs carry the language after the site's base, English without: /docs/formats,
// /docs/es/formats. Fumadocs owns them; this Worker has no Paraglide.

type SiteConfig = { defaultLanguage: string; languages: string[] };

function site(name: SiteName, content: ReturnType<typeof usersDocs.toFumadocsSource>, config: SiteConfig) {
  const base = `/${name}`;
  const i18n = defineI18n({ defaultLanguage: config.defaultLanguage, languages: config.languages, parser: 'dot', fallbackLanguage: config.defaultLanguage });
  const url = (slugs: string[], locale?: string) => [base, locale && locale !== config.defaultLanguage ? locale : '', ...slugs].filter(Boolean).join('/');
  const source = loader({ baseUrl: base, source: content, i18n, url });
  const docsLlms = llms(source, {
    renderPage: async page => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
  });
  /** A splat after the base (`es/formats`, `formats`, ``) as its language and page slugs. */
  const parse = (splat = '') => {
    const parts = splat.split('/').filter(Boolean);
    const lang = parts[0] && parts[0] !== config.defaultLanguage && config.languages.includes(parts[0]) ? parts.shift()! : config.defaultLanguage;
    return { lang, slugs: parts };
  };
  return { name, base, config, source, llms: docsLlms, search: createFromSource(source), parse, url };
}

export const sites = {
  docs: site('docs', usersDocs.toFumadocsSource(), usersI18n),
  dev: site('dev', devDocs.toFumadocsSource(), devI18n),
};

/**
 * The API reference at /reference, apart from the docs sites: fumadocs-openapi's pages (one per operation)
 * over the spec the oRPC contract generates, as Fumadocs' OpenAPI example builds it. English only.
 */
export const reference = loader({ baseUrl: '/reference', source: await openapi.staticSource({ meta: true }), plugins: [openapiPlugin()] });
export const referenceSearch = createFromSource(reference);
export type Site = (typeof sites)[SiteName];
export const isSiteName = (value: string): value is SiteName => value in sites;
