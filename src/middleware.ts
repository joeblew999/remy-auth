import { createMiddleware } from '@tanstack/react-start';
import { getResponseStatus, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { logContext, outcome, level, requestIdHeader, writeLog } from '@joeblew999/remy-ui/worker';
import { service } from './service';


/**
 * Request middleware (every server request: pages, server routes, server functions): the request
 * ID the Worker entry generated for this request, from the header it sets and never from the
 * client (withObservability replaces any client value), as `context.requestId`.
 */
export const requestContext = createMiddleware().server(({ request, next }) =>
  next({ context: { requestId: request.headers.get(requestIdHeader) ?? crypto.randomUUID() } }));

/** Where browsers send Content Security Policy reports: the server route src/routes/csp-report.ts. */
export const cspReportPath = '/csp-report';

/**
 * Request middleware: a fresh nonce per request as `context.nonce`, which getRouter hands to
 * TanStack Router (`ssr.nonce`) so every script it renders carries it, and a strict nonce-based
 * Content Security Policy for that nonce, sent report-only while reports prove it breaks nothing
 * (.plans/gui-portal.md, item 7). Browsers report to cspReportPath under the name `csp`.
 */
export const cspNonce = createMiddleware().server(({ next }) => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  setResponseHeader('Reporting-Endpoints', `csp="${cspReportPath}"`);
  setResponseHeader('Content-Security-Policy-Report-Only',
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'report-sample'; object-src 'none'; base-uri 'none'; report-uri ${cspReportPath}; report-to csp`);
  return next({ context: { nonce } });
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
