import { createFileRoute } from '@tanstack/react-router';
import { isSiteName, referenceSearch, sites } from '@/lib/source';

// As Fumadocs' template's /api/search, once per site: /api/search/<site>?query=...&locale=es, and the API
// reference's (/api/search/reference).
export const Route = createFileRoute('/api/search/$site')({
  server: {
    handlers: {
      GET: ({ params, request }) => (params.site === 'reference' ? referenceSearch.GET(request)
        : isSiteName(params.site) ? sites[params.site].search.GET(request) : new Response(undefined, { status: 404 })),
    },
  },
});
