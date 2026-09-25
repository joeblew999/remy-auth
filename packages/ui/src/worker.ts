import { isLocale } from './paraglide/runtime.js';

// Generic observability for any Worker built on this package: a request ID on every response,
// one structured log line per request following the shared log contract, and a liveness route.
// Never logs URLs, query strings, cookies, headers, bodies or geolocation.

export type ObservedEnv = { ENVIRONMENT?: string; CF_VERSION_METADATA?: { id?: string } };
type Fetch<E> = (request: Request, env: E, ctx: ExecutionContext) => Response | Promise<Response>;

/** The header carrying the request ID: on every response, and on the request the inner handler sees. */
export const requestIdHeader = 'X-Request-ID';

/** A route template for logs: a leading locale becomes :locale and unmatched paths are '*', never a raw path. */
export function routeTemplate(pathname: string, status: number): string {
  if (status === 404) return '*';
  const segments = pathname.split('/').filter(Boolean);
  return '/' + segments.map((segment, index) => (index === 0 && isLocale(segment) ? ':locale' : segment)).join('/');
}

/** The log contract's outcome and level for an HTTP status. */
export const outcome = (status: number) => status >= 500 ? 'server_error' : status >= 400 ? 'client_error' : status >= 300 ? 'redirect' : 'ok';
export const level = (status: number) => status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

/** The fields every line of the shared log contract starts with. */
export function logContext(service: string, env: ObservedEnv, requestId: string, method: string) {
  return { schemaVersion: 1, service, environment: env.ENVIRONMENT ?? 'production', release: env.CF_VERSION_METADATA?.id ?? 'local', requestId, method };
}

/** Writes one line of the shared log contract: error lines to console.error, the rest to console.log. */
export function writeLog(line: { level: string } & Record<string, unknown>) {
  const text = JSON.stringify(line);
  if (line.level === 'error') console.error(text); else console.log(text);
}

/**
 * Wraps a Worker's fetch handler. `/healthz` answers liveness without reaching the app.
 * The handler receives the request with this request's ID in `X-Request-ID` (any value the
 * client sent is replaced), so its own logs, for example per server function, correlate.
 * Durations are left to Cloudflare's invocation data: the runtime freezes timers during a request.
 */
export function withObservability<E extends ObservedEnv>(service: string, handler: Fetch<E>): { fetch: Fetch<E> } {
  return {
    async fetch(request, env, ctx) {
      const requestId = crypto.randomUUID();
      const { pathname } = new URL(request.url);
      const base = logContext(service, env, requestId, request.method);
      const finish = (response: Response, event: string, route: string, reasonCode?: string) => {
        const out = new Response(response.body, response); // mutable headers, even for asset responses
        out.headers.set(requestIdHeader, requestId);
        out.headers.set('X-Content-Type-Options', 'nosniff');
        out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Powerful features off by default; location only for this origin (the device-place card).
        out.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
        writeLog({ ...base, event, level: level(out.status), route, status: out.status, outcome: outcome(out.status), ...(reasonCode ? { reasonCode } : {}) });
        return out;
      };
      if (pathname === '/healthz') {
        return finish(Response.json({ status: 'ok', service, release: base.release }, { headers: { 'Cache-Control': 'no-store' } }), 'liveness', '/healthz');
      }
      try {
        // Same URL, method, body and Cloudflare properties (`cf`); only the request ID header differs.
        const headers = new Headers(request.headers);
        headers.set(requestIdHeader, requestId);
        const response = await handler(new Request(request, { headers }), env, ctx);
        return finish(response, 'http_request', routeTemplate(pathname, response.status));
      } catch {
        return finish(new Response('Service unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }), 'request_failed', routeTemplate(pathname, 503), 'unhandled_exception');
      }
    },
  };
}
