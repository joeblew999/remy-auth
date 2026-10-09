import { ORPCError } from '@orpc/client';
import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferenceHandlerPlugin } from '@orpc/openapi/plugins';
import type { AnyRouter, Context, Router } from '@orpc/server';
import { CORSHandlerPlugin } from '@orpc/server/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { apiPrefix, statusesOf } from './coverage.js';

// The server half of an app's contract-first API (.plans/openapi-contracts.md): oRPC's
// OpenAPIHandler behind one TanStack Start server route, with the OpenAPI document generated from
// the router in-process (never committed) and oRPC's reference page. oRPC validates every input
// (400) and every output (500 rather than a response the document does not promise).

/** Where the generated document and its reference page are served. */
export const specPath = `${apiPrefix}openapi.json` as const;
export const docsPath = `${apiPrefix}doc` as const;

/**
 * The reference page's script (Scalar, oRPC's default provider), pinned: oRPC's default URL
 * follows Scalar's latest release. Only /api/doc loads it; no app or site page does.
 */
export const scalarScript = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.72.0';

/** The generated document's `info`: an app's own title, version and description. */
export type ApiInfo = { title: string; version: string; description?: string };
/** The HTTP status of each of the API's own error codes; oRPC's common codes (UNAUTHORIZED, NOT_FOUND, ...) have theirs. */
export type ErrorStatuses = Readonly<Record<string, number>>;

// Zod 4 schemas become JSON Schema; the same generator for every app.
const generator = new OpenAPIGenerator({ converters: [new ZodToJsonSchemaConverter()] });

/**
 * The OpenAPI 3.1 document for a router or contract, exactly as /api/openapi.json serves it
 * (3.1 is what the docs' reference reads; oRPC builds 3.2 and downgrades it).
 */
export function generateSpec(router: AnyRouter, info: ApiInfo, errorStatuses?: ErrorStatuses) {
  return generator.generate(router, { version: '3.1.1', base: { info }, errorStatusMap: statusesOf(errorStatuses) });
}

/**
 * A Start server route's handlers for `router`, for a splat route at /api (src/routes/api.$.ts):
 * `server: { handlers: apiHandlers(router, ...) }`. `context` builds each request's oRPC context
 * from the request (the Worker's request ID, the asked language and so on). `errorStatuses` gives
 * the API's own error codes their HTTP statuses (oRPC keeps statuses out of the contract's errors).
 * Unknown API paths answer oRPC's own NOT_FOUND error body with 404. `origins` are the other apps'
 * origins that may call this API from their pages (oRPC's CORSHandlerPlugin): exact origins, no
 * wildcard; a browser on any other origin gets no Access-Control-Allow-Origin and so cannot read the
 * answer. Empty by default. An answer to a request with a cookie or an Authorization header, and
 * every 401, is `no-store`.
 */
export function apiHandlers<T extends Context>(router: Router<T>, { info, context, origins = [], errorStatuses }: {
  info: ApiInfo;
  context: (request: Request) => T | Promise<T>;
  origins?: readonly string[];
  errorStatuses?: ErrorStatuses;
}) {
  if (origins.some(origin => origin === '*' || new URL(origin).origin !== origin)) throw new Error(`apiHandlers: origins are exact origins like https://app.example, got ${origins.join(', ')}`);
  const cors = origins.length ? [new CORSHandlerPlugin<T>({ origin: [...origins], allowMethods: ['GET', 'HEAD', 'POST'] })] : [];
  const handler = new OpenAPIHandler<T>(router, {
    errorStatusMap: statusesOf(errorStatuses),
    plugins: [...cors, new OpenAPIReferenceHandlerPlugin<T, 'scalar'>({
      spec: () => generateSpec(router, info, errorStatuses),
      specPath,
      docsPath,
      docsTitle: info.title,
      providerScriptUrl: scalarScript,
    })],
  });
  const handle = async ({ request }: { request: Request }) => {
    const { matched, response } = await handler.handle(request, { context: await context(request) });
    if (matched) {
      // An answer to a caller who sent credentials, and a refusal for lack of them, are about one
      // person: no cache keeps either. A procedure that sets its own Cache-Control keeps it.
      const personal = request.headers.has('Cookie') || request.headers.has('Authorization') || response.status === 401;
      if (personal && !response.headers.has('Cache-Control')) response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    const missing = new ORPCError('NOT_FOUND', { message: 'No API endpoint at this path and method.' });
    return Response.json(missing.toJSON(), { status: 404 });
  };
  return { ANY: handle };
}
