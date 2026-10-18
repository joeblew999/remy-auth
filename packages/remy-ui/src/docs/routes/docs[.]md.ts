import { createFileRoute } from '@tanstack/react-router';
import { markdown } from '../lib/handlers';

// The front page as Markdown at /docs.md, as root llms.txt tells AI tools ("add .md to a page's URL"): /docs/{$}.md
// covers every other page, and /docs.md was a 404 (2026-10-17).
export const Route = createFileRoute('/docs.md')({
  server: { handlers: { GET: () => markdown('docs', 'index') } },
});
