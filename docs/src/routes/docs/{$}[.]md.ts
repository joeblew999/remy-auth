import { createFileRoute } from '@tanstack/react-router';
import { markdown } from '@/lib/handlers';

// Written by `docs:cli feature llms`, for this site: /docs/<lang?>/<page>.md.
export const Route = createFileRoute('/docs/{$}.md')({
  server: { handlers: { GET: ({ params }) => markdown('docs', params._splat) } },
});
