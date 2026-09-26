import { createFileRoute } from '@tanstack/react-router';
import { referenceText } from '@/lib/handlers';

// The API reference's llms.txt and llms-full.txt, as the docs sites' (/reference/llms.txt).
export const Route = createFileRoute('/reference/{$}.txt')({
  server: { handlers: { GET: ({ params, request }) => referenceText(`${params._splat}.txt`, new URL(request.url).origin) } },
});
