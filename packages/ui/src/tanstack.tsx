import type { LocationRewrite } from '@tanstack/react-router';
import { paraglideMiddleware } from './paraglide/server.js';
import { deLocalizeUrl, localizeUrl, getLocale, getUrlOrigin, extractLocaleFromUrl, extractLocaleFromRequest,
  extractLocaleFromRequestWithStrategies, extractLocaleFromHeader, extractLocaleFromCookie, extractLocaleFromNavigator,
  shouldRedirect, type Locale } from './paraglide/runtime.js';
import { alternates } from './seo';
import { withObservability } from './worker';
import { publicPaths } from './paths.js';

// TanStack Router and Start glue over Paraglide's official integration
// (https://paraglidejs.com/tanstack-start). Plain functions only: nothing here needs the Start
// compiler, so the module works the same from a workspace or from node_modules. Apps wire the
// environment-specific pieces (createServerFn, createIsomorphicFn) in their own files.

/**
 * The router's `rewrite`: public URLs carry the locale (/es/formats), routes do not (/formats).
 * Links are localized on the way out, so `<Link to="/formats">` renders /es/formats on a Spanish page.
 */
export const localeRewrite = {
  input: ({ url }) => deLocalizeUrl(url),
  output: ({ url }) => localizeUrl(url),
} satisfies LocationRewrite;

type ObservedEnv = { ENVIRONMENT?: string; CF_VERSION_METADATA?: { id?: string } };
type StartFetch = (request: Request) => Response | Promise<Response>;

/**
 * The Worker entry for a server-rendered Start app: `withObservability` (request ID, log line,
 * /healthz) around Paraglide's middleware (per-request locale, 307 for un-localized document
 * requests) around Start's handler. Start gets the ORIGINAL request, as Paraglide's guide
 * requires with a router rewrite, so `request.cf` and the headers reach loaders and server
 * functions. Un-localized entry URLs (`entryPaths`) answer 302 to the visitor's language for
 * every other request type too, varying on Accept-Language and Cookie. HTML is never cached.
 */
export function localizedWorker<E extends ObservedEnv>(service: string, start: { fetch: StartFetch },
  { entryPaths = publicPaths }: { entryPaths?: readonly string[] } = {}) {
  return withObservability<E>(service, request => paraglideMiddleware(request, async () => {
    const entry = await entryRedirect(request, entryPaths);
    if (entry) return entry;
    const response = await start.fetch(request);
    if (!response.headers.get('Content-Type')?.includes('text/html') || response.headers.has('Cache-Control')) return response;
    const out = new Response(response.body, response);
    out.headers.set('Cache-Control', 'no-store');
    return out;
  }));
}

/** A 302 to Paraglide's localized URL for an un-localized entry path, or undefined for anything else. */
export async function entryRedirect(request: Request, entryPaths: readonly string[] = publicPaths): Promise<Response | undefined> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
  const url = new URL(request.url);
  if (extractLocaleFromUrl(url) || !entryPaths.some(path => (path || '/') === url.pathname)) return undefined;
  const decision = await shouldRedirect({ request });
  if (!decision.shouldRedirect || !decision.redirectUrl) return undefined;
  const { pathname, search } = decision.redirectUrl;
  return new Response(null, { status: 302, headers: { Location: pathname + search, Vary: 'Accept-Language, Cookie' } });
}

/**
 * A language to offer on a localized page, on the server: the Accept-Language match when it
 * differs from the page and Paraglide's cookie is not already this page's language. The runtime
 * writes that cookie from the URL on every visit, so it holds the last visited or chosen language.
 */
export function suggestedLocale(request: Request): Locale | undefined {
  const page = extractLocaleFromRequest(request);
  const header = extractLocaleFromHeader(request);
  let remembered: Locale | undefined;
  try { remembered = extractLocaleFromRequestWithStrategies(request, ['cookie']); } catch { remembered = undefined; }
  return header && header !== page && remembered !== page ? header : undefined;
}

/** The same decision in the browser, for client-side navigations: the browser's languages instead of the header. */
export function suggestedLocaleInBrowser(page: Locale): Locale | undefined {
  const browser = extractLocaleFromNavigator();
  const remembered = extractLocaleFromCookie();
  return browser && browser !== page && remembered !== page ? browser : undefined;
}

type HeadOptions = {
  /** The de-localized public path: '' for home, '/formats', ... */
  path: string;
  title: (locale: Locale) => string;
  description: (locale: Locale) => string;
  /** Defaults to the page's locale from Paraglide (the request on the server, the URL in the browser). */
  locale?: Locale;
  /** Defaults to the request's origin on the server and the page's origin in the browser; pass the public origin when prerendering. */
  origin?: string;
  brand?: string;
};

/**
 * A route's `head()`: title, description, self-canonical URL and reciprocal hreflang links
 * (every locale plus x-default, the un-localized entry URL), from Paraglide's URL patterns.
 */
export function pageHead({ path, title, description, locale = getLocale(), origin = getUrlOrigin(), brand = 'Remy' }: HeadOptions) {
  const links = alternates(origin, path, locale);
  return {
    meta: [{ title: `${title(locale)} | ${brand}` }, { name: 'description', content: description(locale) }],
    links: [
      { rel: 'canonical', href: links.canonical },
      ...links.alternates.map(link => ({ rel: 'alternate', hrefLang: link.hrefLang, href: link.href })),
    ],
  };
}
