import { createRequestHandler } from 'react-router';

const handleRequest = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request, _env, _ctx) {
    const started = performance.now();
    const requestId = crypto.randomUUID();
    try {
      const response = await handleRequest(request);
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      // Deliberately omit URLs, cookies and headers from logs.
      console.log(JSON.stringify({ event: 'http_request', requestId,
        method: request.method, status: response.status,
        durationMs: Math.round(performance.now() - started) }));
      return response;
    } catch {
      console.error(JSON.stringify({ event: 'request_failed', requestId }));
      return new Response('Service unavailable', { status: 503,
        headers: { 'X-Request-ID': requestId, 'Cache-Control': 'no-store' } });
    }
  },
} satisfies ExportedHandler<Env>;
