import { env } from 'cloudflare:workers';
import { createFileRoute } from '@tanstack/react-router';
import { readOutbox } from '@joeblew999/remy-ui/mail';
import { permits } from '../auth/environment';

// The local outbox, read back (.plans/auth-service.md, "Development conveniences"): the newest mail
// captured for one address, for a developer signing in locally and for the checks (tests/people.ts).
// It exists only where the environment table says mail is captured, which is the local environment
// alone; anywhere else mail is really sent, there is nothing to read, and this answers 404, like a
// path that was never built.
export const Route = createFileRoute('/dev/mail')({
  server: { handlers: { GET: ({ request }) => {
    if (!permits(env, 'capturesMail')) return new Response('Not found', { status: 404 });
    const recipient = new URL(request.url).searchParams.get('recipient') ?? '';
    return Response.json({ recipient, mail: readOutbox(recipient).slice(0, 5) }, { headers: { 'Cache-Control': 'no-store' } });
  } } },
});
