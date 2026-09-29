import start from '@tanstack/react-start/server-entry';
import { withObservability } from '../worker';
import { service } from './service';

// The docs Worker's entry: the shared observability wrapper (request ID, one log line, /healthz) around
// TanStack Start. No Paraglide: Fumadocs owns the docs' languages and URLs.
export default withObservability<Env>(service, request => start.fetch(request)) satisfies ExportedHandler<Env>;
