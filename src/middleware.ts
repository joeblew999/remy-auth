import { createMiddleware } from '@tanstack/react-start';
import { getResponseStatus } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { getLocale, isLocale } from '@joeblew999/remy-ui/locale';
import { logContext, outcome, level, requestIdHeader, writeLog } from '@joeblew999/remy-ui/worker';
import { service } from './service';


/**
 * Request middleware (every server request: pages, server routes, server functions): the request
 * ID the Worker entry generated for this request, from the header it sets and never from the
 * client (withObservability replaces any client value), as `context.requestId`.
 */
export const requestContext = createMiddleware().server(({ request, next }) =>
  next({ context: { requestId: request.headers.get(requestIdHeader) ?? crypto.randomUUID() } }));

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

/**
 * Function middleware for server functions that answer in words: the browser sends its page's
 * language, and the server uses it when it is one of ours, else Paraglide's own choice for the
 * request (cookie, Accept-Language, base locale). A language is not a permission, so a shape
 * check is enough here.
 */
export const pageLocale = createMiddleware({ type: 'function' })
  .client(({ next }) => next({ sendContext: { locale: getLocale() } }))
  .server(({ next, context }) => next({ context: { locale: isLocale(context.locale) ? context.locale : getLocale() } }));
