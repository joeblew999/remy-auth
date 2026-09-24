import { ServerRouter, type EntryContext } from 'react-router';
import { renderToReadableStream } from 'react-dom/server';

export default async function handleRequest(
  request: Request, status: number, headers: Headers, context: EntryContext,
) {
  const stream = await renderToReadableStream(
    <ServerRouter context={context} url={request.url} />,
    { signal: request.signal, onError() { status = 500; console.error(JSON.stringify({ event: 'render_failed' })); } },
  );
  // The proof is small. Deliver complete HTML to humans and crawlers alike.
  await stream.allReady;
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(stream, { status, headers });
}
