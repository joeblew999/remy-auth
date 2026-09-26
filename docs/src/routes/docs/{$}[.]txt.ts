import { createFileRoute } from '@tanstack/react-router';
import { llmsText } from '@/lib/handlers';

// Written by `docs:cli feature llms`, for this site: /docs/<lang?>/llms.txt and llms-full.txt.
export const Route = createFileRoute('/docs/{$}.txt')({
  server: { handlers: { GET: ({ params }) => llmsText('docs', params._splat) } },
});
