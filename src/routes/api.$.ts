import { createFileRoute } from '@tanstack/react-router';
import { info } from '@joeblew999/remy-auth-contract';
import { apiHandlers } from '@joeblew999/remy-ui/api/server';
import { router } from '../api/router';
import { apiContext } from '../api/context.server';

// Every contract endpoint (@joeblew999/remy-auth-contract) under /api, plus the generated
// document at /api/openapi.json and its reference page at /api/doc: oRPC's OpenAPIHandler behind
// one Start server route, as oRPC's TanStack Start adapter documents.
export const Route = createFileRoute('/api/$')({
  server: {
    handlers: apiHandlers(router, {
      info,
      context: apiContext,
    }),
  },
});
