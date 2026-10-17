import { createFileRoute } from '@tanstack/react-router';
import { referenceText } from '../lib/handlers';

// The API reference's front page as Markdown at /reference.md (root llms.txt: "add .md to a page's URL"): every
// operation with its description, as its llms.txt lists them; it was a 404 (2026-10-17).
export const Route = createFileRoute('/reference.md')({
  server: { handlers: { GET: ({ request }) => referenceText('llms.txt', new URL(request.url).origin) } },
});
