import { createFileRoute } from '@tanstack/react-router';
import { ogImage } from '@/lib/handlers';
import { isSiteName } from '@/lib/source';

// Written by `docs:cli feature og`: /og/<site>/<lang?>/<page>/image.webp.
export const Route = createFileRoute('/og/$')({
  server: {
    handlers: {
      GET: ({ params }) => {
        const [name, ...rest] = (params._splat ?? '').split('/');
        return name && isSiteName(name) ? ogImage(name, rest.join('/')) : new Response(undefined, { status: 404 });
      },
    },
  },
});
