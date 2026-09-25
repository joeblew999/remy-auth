import { createFileRoute, redirect } from '@tanstack/react-router';
import { askSearchSchema } from '../ask';

// The answer page was the app page /app/ask; it is the site page /docs/ask now (.plans/docs-ai-sync.md,
// "Ask from the site"). Old links and bookmarks, in every language, redirect there permanently with
// their question.
export const Route = createFileRoute('/app/ask')({
  validateSearch: askSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/docs/ask', search: { q: search.q }, statusCode: 301 });
  },
});
