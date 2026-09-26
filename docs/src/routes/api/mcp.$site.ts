import { createFileRoute } from '@tanstack/react-router';
import { mcpHandler } from '@/lib/handlers';
import { isSiteName } from '@/lib/source';

// Written by `docs:cli feature mcp`, once per site: /api/mcp/<site>.
const handle = ({ params, request }: { params: { site: string }; request: Request }) =>
  (isSiteName(params.site) ? mcpHandler(params.site, request) : new Response(undefined, { status: 404 }));

export const Route = createFileRoute('/api/mcp/$site')({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});
