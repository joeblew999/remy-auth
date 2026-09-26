import { createFileRoute } from '@tanstack/react-router';
import { cspReport } from '@joeblew999/remy-ui/csp-report';
import { service } from '../service';

// Where browsers send Content Security Policy reports: the shared handler (@joeblew999/remy-ui/csp-report).
export const Route = createFileRoute('/csp-report')({ server: { handlers: cspReport(service) } });
