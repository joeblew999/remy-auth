import { createFileRoute } from '@tanstack/react-router';
import { referenceText } from '@/lib/handlers';

// An API reference page as Markdown (/reference/<operation>.md), as the docs sites' pages.
export const Route = createFileRoute('/reference/{$}.md')({
  server: { handlers: { GET: ({ params }) => referenceText(`${params._splat}.md`) } },
});
