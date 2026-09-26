import { createFileRoute } from '@tanstack/react-router';
import { llmsText } from '@/lib/handlers';

// Written by `docs:cli feature llms`, for this site: /dev/<lang?>/llms.txt and llms-full.txt.
export const Route = createFileRoute('/dev/{$}.txt')({
  server: { handlers: { GET: ({ params, request }) => llmsText('dev', params._splat, new URL(request.url).origin) } },
});
