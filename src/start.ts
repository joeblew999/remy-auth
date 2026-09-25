import { createStart } from '@tanstack/react-start';

// Start's global configuration: request middleware runs for every server request (SSR, server
// routes, server functions) inside the Worker entry (src/server.ts); function middleware runs
// for every server function call. Empty until the showcase adds its middleware.
export const startInstance = createStart(() => ({
  requestMiddleware: [],
  functionMiddleware: [],
}));
