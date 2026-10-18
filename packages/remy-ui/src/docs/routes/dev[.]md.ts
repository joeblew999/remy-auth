import { createFileRoute } from '@tanstack/react-router';
import { markdown } from '../lib/handlers';

// The front page as Markdown at /dev.md, as root llms.txt tells AI tools ("add .md to a page's URL"): /dev/{$}.md
// covers every other page, and /dev.md was a 404 (2026-10-17).
export const Route = createFileRoute('/dev.md')({
  server: { handlers: { GET: () => markdown('dev', 'index') } },
});
