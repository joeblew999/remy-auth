import { createFileRoute, redirect } from '@tanstack/react-router';
import { docsOrigin } from '../docs/origin';

// The answer page was the app page /app/ask, then the site page /docs/ask; Ask AI now lives with the
// docs in the docs Worker (docs/), so this old address redirects there permanently.
export const Route = createFileRoute('/app/ask')({
  beforeLoad: () => { throw redirect({ href: `${docsOrigin}/docs`, statusCode: 301 }); },
});
