import { createMiddleware } from '@tanstack/react-start';
import { getResponseStatus } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { logContext, outcome, level, requestIdHeader, writeLog } from '@joeblew999/remy-ui/worker';
import { service } from './service';
import { cspEnforced, cspReportPath } from './csp';


/**
 * Request middleware (every server request: pages, server routes, server functions): the request
 * ID the Worker entry generated for this request, from the header it sets and never from the
 * client (withObservability replaces any client value), as `context.requestId`.
 */
export const requestContext = createMiddleware().server(({ request, next }) =>
  next({ context: { requestId: request.headers.get(requestIdHeader) ?? crypto.randomUUID() } }));

/**
 * Request middleware: a fresh nonce per request as `context.nonce`, which getRouter hands to
 * TanStack Router (`ssr.nonce`) so every script it renders carries it, and a strict nonce-based
 * Content Security Policy for that nonce: enforced, or report-only, by the one switch cspEnforced
 * (src/csp.ts; .plans/gui-portal.md, item 7). Browsers report violations to cspReportPath under
 * the name `csp` either way. withObservability appends its own `frame-ancestors 'none'` policy.
 *
 * The headers go on the response `next` returns, not through setResponseHeader: Start merges the
 * latter only into successful responses, so the not-found and error pages (404, 500), whose
 * scripts carry the nonce too, went out with no policy at all. A response whose headers are
 * immutable (a redirect made with Response.redirect) runs no script and keeps its own.
 */
export const cspNonce = createMiddleware().server(async ({ next }) => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const result = await next({ context: { nonce } });
  try {
    result.response.headers.set('Reporting-Endpoints', `csp="${cspReportPath}"`);
    result.response.headers.set(cspEnforced ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
      `script-src 'nonce-${nonce}' 'strict-dynamic' 'report-sample'; object-src 'none'; base-uri 'none'; report-uri ${cspReportPath}; report-to csp`);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
  }
  return result;
});

/**
 * Function middleware (every server function call): one structured line per call in the shared
 * log contract (event `server_fn`, the function's name, its outcome), under the same request ID
 * as the Worker's `http_request` line. The ID also goes back to the caller with the result, so a
 * browser can quote it. Logs no arguments, results or error messages.
 */
export const serverFnLog = createMiddleware({ type: 'function' })
  .middleware([requestContext])
  .server(async ({ next, context, method, serverFnMeta }) => {
    const write = (status: number) => writeLog({ ...logContext(service, env, context.requestId, method),
      event: 'server_fn', level: level(status), function: serverFnMeta.name, outcome: outcome(status) });
    try {
      const result = await next({ sendContext: { requestId: context.requestId } });
      write(getResponseStatus());
      return result;
    } catch (error) {
      // A function rejects bad input by setting a 4xx status before throwing; anything else is the server's failure.
      const status = getResponseStatus();
      write(status >= 400 ? status : 500);
      throw error;
    }
  });
