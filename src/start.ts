import { createStart } from '@tanstack/react-start';
import { cspNonce, requestContext, serverFnLog } from './middleware';

// Start's global configuration: request middleware runs for every server request (SSR, server
// routes, server functions) inside the Worker entry (src/server.ts); function middleware runs
// for every server function call. See src/middleware.ts.
export const startInstance = createStart(() => ({
  // The Worker's request ID as context.requestId, and a per-request CSP nonce as context.nonce
  // with its nonce policy (enforced or report-only: src/csp.ts), for every server request.
  requestMiddleware: [requestContext, cspNonce],
  // One log line per server function call, under that request ID.
  functionMiddleware: [serverFnLog],
}));
