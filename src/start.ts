import { createStart } from '@tanstack/react-start';
import { requestContext, serverFnLog } from './middleware';

// Start's global configuration: request middleware runs for every server request (SSR, server
// routes, server functions) inside the Worker entry (src/server.ts); function middleware runs
// for every server function call. See src/middleware.ts.
export const startInstance = createStart(() => ({
  // The Worker's request ID as context.requestId, for every server request.
  requestMiddleware: [requestContext],
  // One log line per server function call, under that request ID.
  functionMiddleware: [serverFnLog],
}));
