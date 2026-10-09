import { createFileRoute } from '@tanstack/react-router';
import { auth } from '../auth/auth.server';

// Better Auth's own endpoints (sign-in, session, sign-out) under /api/auth, as its TanStack Start
// guide mounts them: one catch-all server route handing the request to auth.handler. It is more
// specific than the contract's /api/$ route beside it, so the router sends /api/auth/* here.
const handle = ({ request }: { request: Request }) => auth(request).handler(request);

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: handle, POST: handle } },
});
