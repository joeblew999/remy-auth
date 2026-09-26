import { createFileRoute } from '@tanstack/react-router';
import { markdown } from '@/lib/handlers';

// Written by `docs:cli feature llms`, for this site: /dev/<lang?>/<page>.md.
export const Route = createFileRoute('/dev/{$}.md')({
  server: { handlers: { GET: ({ params }) => markdown('dev', params._splat) } },
});
