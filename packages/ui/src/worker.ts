import { isLocale } from './paraglide/runtime.js';

// Generic observability for any Worker built on this package: a request ID on every response,
// one structured log line per request following the shared log contract, and a liveness route.
// Never logs URLs, query strings, cookies, headers, bodies or geolocation.

type ObservedEnv = { ENVIRONMENT?: string; CF_VERSION_METADATA?: { id?: string } };
type Fetch<E> = (request: Request, env: E, ctx: ExecutionContext) => Response | Promise<Response>;

/** A route template for logs: a leading locale becomes :locale and unmatched paths are '*', never a raw path. */
export function routeTemplate(pathname: string, status: number): string {
  if (status === 404) return '*';
  const segments = pathname.split('/').filter(Boolean);
  return '/' + segments.map((segment, index) => (index === 0 && isLocale(segment) ? ':locale' : segment)).join('/');
}

const outcome = (status: number) => status >= 500 ? 'server_error' : status >= 400 ? 'client_error' : status >= 300 ? 'redirect' : 'ok';
const level = (status: number) => status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

/**
 * Wraps a Worker's fetch handler. `/healthz` answers liveness without reaching the app.
 * Durations are left to Cloudflare's invocation data: the runtime freezes timers during a request.
 */
export function withObservability<E extends ObservedEnv>(service: string, handler: Fetch<E>): { fetch: Fetch<E> } {
  return {
    async fetch(request, env, ctx) {
      const requestId = crypto.randomUUID();
      const { pathname } = new URL(request.url);
      const base = { schemaVersion: 1, service, environment: env.ENVIRONMENT ?? 'production', release: env.CF_VERSION_METADATA?.id ?? 'local', requestId, method: request.method };
      const finish = (response: Response, event: string, route: string, reasonCode?: string) => {
        const out = new Response(response.body, response); // mutable headers, even for asset responses
        out.headers.set('X-Request-ID', requestId);
        out.headers.set('X-Content-Type-Options', 'nosniff');
        out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        const line = JSON.stringify({ ...base, event, level: level(out.status), route, status: out.status, outcome: outcome(out.status), ...(reasonCode ? { reasonCode } : {}) });
        if (out.status >= 500) console.error(line); else console.log(line);
        return out;
      };
      if (pathname === '/healthz') {
        return finish(Response.json({ status: 'ok', service, release: base.release }, { headers: { 'Cache-Control': 'no-store' } }), 'liveness', '/healthz');
      }
      try {
        const response = await handler(request, env, ctx);
        return finish(response, 'http_request', routeTemplate(pathname, response.status));
      } catch {
        return finish(new Response('Service unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }), 'request_failed', routeTemplate(pathname, 503), 'unhandled_exception');
      }
    },
  };
}
