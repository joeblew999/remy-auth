import { createFileRoute } from '@tanstack/react-router';
import { isMcpName, mcpHandler } from '@/lib/handlers';

// Written by `docs:cli feature mcp`, once per audience: /api/mcp/docs (product), dev, reference.
const handle = ({ params, request }: { params: { site: string }; request: Request }) =>
  (isMcpName(params.site) ? mcpHandler(params.site, request) : new Response(undefined, { status: 404 }));

export const Route = createFileRoute('/api/mcp/$site')({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});
