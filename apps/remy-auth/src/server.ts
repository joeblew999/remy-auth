import start from '@tanstack/react-start/server-entry';
import { localizedWorker } from '@joeblew999/remy-ui/tanstack';
import { service } from './service';
import { everyPath } from './paths';

// The Worker entry: the shared wrapper adds the request ID, the structured log line, /healthz
// and Paraglide's middleware (locale per request, entry redirects for every page, the docs and
// /docs/ask included), then hands the original request, with Cloudflare's `cf`, to TanStack Start.
export default localizedWorker<Env>(service, start, { entryPaths: everyPath }) satisfies ExportedHandler<Env>;
