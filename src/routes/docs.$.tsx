import { createFileRoute, redirect } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { docsOrigin } from '../docs/origin';

// The docs used to be this app's own pages (/<locale>/docs/<page>): developer docs, English and Spanish.
// They live in the docs Worker now (docs/), so each old address redirects permanently to its page there,
// in the same language: /es/docs/gui → /dev/es/gui. Search engines move their index along.
export const Route = createFileRoute('/docs/$')({
  beforeLoad: ({ params }) => {
    const lang = getLocale() === 'es' ? 'es/' : '';
    throw redirect({ href: `${docsOrigin}/dev/${lang}${params._splat ?? ''}`.replace(/\/$/, ''), statusCode: 301 });
  },
});
