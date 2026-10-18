import { createFileRoute } from '@tanstack/react-router';
import { cspReport } from '../csp-report';
import { registeredApp } from '../app-config';

// Where browsers send Content Security Policy reports, in every app (remyParts mounts this directory beside
// the app's routes): the shared handler (POST, anything else 405), logging under the app's service name
// (defineRemyApp's `service`), read when a request arrives, since the app's config registers when its root
// route loads.
const handlers = () => cspReport(registeredApp()?.service ?? 'app');
type Args<K extends 'POST'> = Parameters<ReturnType<typeof cspReport>[K]>[0];
export const Route = createFileRoute('/csp-report')({
  server: { handlers: { POST: (args: Args<'POST'>) => handlers().POST(args), ANY: () => handlers().ANY() } },
});
