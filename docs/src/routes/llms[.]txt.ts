import { createFileRoute } from '@tanstack/react-router';
import { rootLlmsTxt } from '@/lib/sections';

// /llms.txt, where AI tools look first: the three parts, who each is for, their llms files and MCP servers.
export const Route = createFileRoute('/llms.txt')({
  server: { handlers: { GET: ({ request }) => new Response(rootLlmsTxt(new URL(request.url).origin), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }) } },
});
