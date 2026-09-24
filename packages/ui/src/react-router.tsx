import { redirect } from 'react-router';
import { paraglideMiddleware } from './paraglide/server.js';
import { baseLocale, isLocale, extractLocaleFromRequest, extractLocaleFromRequestWithStrategies, extractLocaleFromHeader, shouldRedirect, type Locale } from './paraglide/runtime.js';
import { alternates } from './seo';

// React Router glue over Paraglide's server pieces. Nothing here is neutral on purpose.

/** Root middleware: scopes Paraglide's locale to the request and redirects un-localized document requests to the visitor's language. */
export function languageMiddleware({ request }: { request: Request }, next: () => Promise<Response>): Promise<Response> {
  return paraglideMiddleware(request, () => next());
}

/**
 * A language to offer on a localized page: the Accept-Language match when it differs from
 * the page and Paraglide's cookie is not already this page's language. The runtime writes
 * that cookie from the URL on every visit, so it holds the last visited or chosen language.
 */
export function suggestedLocale(request: Request): Locale | undefined {
  const page = extractLocaleFromRequest(request);
  const header = extractLocaleFromHeader(request);
  let remembered: Locale | undefined;
  try { remembered = extractLocaleFromRequestWithStrategies(request, ['cookie']); } catch { remembered = undefined; }
  return header && header !== page && remembered !== page ? header : undefined;
}

/** Loader for URLs without a locale: 302 to Paraglide's localized URL for this visitor, for any request type. */
export async function redirectToLocalized(request: Request): Promise<never> {
  const decision = await shouldRedirect({ request });
  if (!decision.shouldRedirect || !decision.redirectUrl) throw new Response('Not found', { status: 404 });
  const { pathname, search } = decision.redirectUrl;
  throw redirect(pathname + search, { status: 302, headers: { Vary: 'Accept-Language, Cookie' } });
}

type MetaDescriptor = { title: string } | { name: string; content: string } | { tagName: 'link'; rel: string; href: string; hrefLang?: string };

/** Title, description, self-canonical and reciprocal hreflang links for a localized public route. */
export function pageMeta(params: { locale?: string }, origin: string, path: string,
  title: (locale: Locale) => string, description: (locale: Locale) => string, brand = 'Remy'): MetaDescriptor[] {
  const locale = isLocale(params.locale) ? params.locale : baseLocale;
  const links = alternates(origin, path, locale);
  return [
    { title: `${title(locale)} | ${brand}` },
    { name: 'description', content: description(locale) },
    { tagName: 'link', rel: 'canonical', href: links.canonical },
    ...links.alternates.map(link => ({ tagName: 'link' as const, rel: 'alternate', hrefLang: link.hrefLang, href: link.href })),
  ];
}
