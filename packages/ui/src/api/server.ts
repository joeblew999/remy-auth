import { ORPCError } from '@orpc/client';
import type { OpenAPI } from '@orpc/contract';
import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import type { AnyRouter, Context, Router } from '@orpc/server';
import { CORSPlugin } from '@orpc/server/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { apiPrefix } from './coverage.js';

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

/** The spec options every app shares: Zod 4 schemas become JSON Schema; `info` is the app's own. */
export const specOptions = { schemaConverters: [new ZodToJsonSchemaConverter()] };

/** The OpenAPI 3.1 document for a router or contract, exactly as /api/openapi.json serves it. */
export function generateSpec(router: AnyRouter, info: OpenAPI.InfoObject): Promise<OpenAPI.Document> {
  return new OpenAPIGenerator(specOptions).generate(router, { info });
}

/**
 * A Start server route's handlers for `router`, for a splat route at /api (src/routes/api.$.ts):
 * `server: { handlers: apiHandlers(router, ...) }`. `context` builds each request's oRPC context
 * from the request (the Worker's request ID, the asked language and so on). Unknown API paths
 * answer oRPC's own NOT_FOUND error body with 404. `origins` are the other apps' origins that may
 * call this API from their pages (oRPC's CORSPlugin): exact origins, no wildcard; a browser on any
 * other origin gets no Access-Control-Allow-Origin and so cannot read the answer. Empty by default.
 */
export function apiHandlers<T extends Context>(router: Router<any, T>, { info, context, origins = [] }: {
  info: OpenAPI.InfoObject;
  context: (request: Request) => T | Promise<T>;
  origins?: readonly string[];
}) {
  if (origins.some(origin => origin === '*' || new URL(origin).origin !== origin)) throw new Error(`apiHandlers: origins are exact origins like https://app.example, got ${origins.join(', ')}`);
  const cors = origins.length ? [new CORSPlugin<T>({ origin: [...origins], allowMethods: ['GET', 'HEAD', 'POST'] })] : [];
  const handler = new OpenAPIHandler(router, {
    plugins: [...cors, new OpenAPIReferencePlugin({
      ...specOptions,
      specGenerateOptions: { info },
      specPath,
      docsPath,
      docsTitle: info.title,
      docsScriptUrl: scalarScript,
    })],
  });
  const handle = async ({ request }: { request: Request }) => {
    const { matched, response } = await handler.handle(request, { context: await context(request) });
    if (matched) return response;
    const missing = new ORPCError('NOT_FOUND', { message: 'No API endpoint at this path and method.' });
    return Response.json(missing.toJSON(), { status: missing.status });
  };
  return { ANY: handle };
}
