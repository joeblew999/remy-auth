import { createFileRoute } from '@tanstack/react-router';
import { seededSignIn } from '../auth/people.server';

// The seeded sign-in, as data (.plans/auth-service.md, "Development conveniences"): the people this
// environment offers to sign in as, what each holds, and the published code they sign in with. The
// account page shows the same list. 404 wherever the environment table offers no seeded sign-in.
export const Route = createFileRoute('/dev/people')({
  server: { handlers: { GET: async ({ request }) => {
    const seeded = await seededSignIn(request);
    return seeded ? Response.json(seeded, { headers: { 'Cache-Control': 'no-store' } }) : new Response('Not found', { status: 404 });
  } } },
});
