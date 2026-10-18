import start from '@tanstack/react-start/server-entry';
import { withObservability } from '../worker';
import { publishPages } from './publish.server';
import { service } from './service';

// The docs Worker's entry: the shared observability wrapper (request ID, one log line, /healthz) around
// TanStack Start. No Paraglide: Fumadocs owns the docs' languages and URLs. In production, the first request a new
// version answers also publishes its pages to Ask AI's bucket, in the background (publish.server.ts).
const observed = withObservability<Env>(service, (request) => start.fetch(request));
// One attempt per version in each isolate: a version whose publish fails says so in its logs once, not on every request.
let attempted: string | undefined;

export default {
  fetch(request, env, ctx) {
    const bucket = (env as { DOCS_PAGES?: R2Bucket }).DOCS_PAGES;
    const version = env.CF_VERSION_METADATA?.id;
    if (
      bucket &&
      version &&
      attempted !== version &&
      env.ENVIRONMENT === 'production' &&
      __REMY_DOCS_ASK_OBJECTS__.length
    ) {
      attempted = version;
      ctx.waitUntil(
        publishPages(bucket, version, new URL(request.url).origin, (page) => start.fetch(page)).catch((error) =>
          console.error(JSON.stringify({ event: 'docs.publish_failed', message: String(error) })),
        ),
      );
    }
    return observed.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
