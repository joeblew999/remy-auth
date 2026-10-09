import { env } from 'cloudflare:workers';
import { createFileRoute } from '@tanstack/react-router';
import { permits } from '../auth/environment';

// The local mail capture, read back (.plans/auth-service.md, "Development conveniences"): the newest
// sign-in codes written for one address, for a developer signing in locally and for the sign-in checks
// (tests/auth.spec.ts). It exists only where the environment policy allows `captureMail`, which is the
// local environment alone; anywhere else it answers 404, like a path that was never built, and the
// table it reads is empty. The Worker that owns the local D1 answers, because a second process reading
// that database while the Worker runs fails with SQLITE_BUSY.
export const Route = createFileRoute('/dev/mail')({
  server: { handlers: { GET: async ({ request }) => {
    if (!permits(env.ENVIRONMENT, 'captureMail')) return new Response('Not found', { status: 404 });
    const recipient = new URL(request.url).searchParams.get('recipient') ?? '';
    const { results } = await env.DB.prepare('select "kind", "code", "createdAt" from "local_mail" where "recipient" = ? order by "id" desc limit 5').bind(recipient).all();
    return Response.json({ recipient, mail: results }, { headers: { 'Cache-Control': 'no-store' } });
  } } },
});
