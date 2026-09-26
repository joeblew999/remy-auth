import { createStart } from '@tanstack/react-start';
import { startMiddleware } from '@joeblew999/remy-ui/start';
import { cspEnforced, cspReportPath } from './csp';
import { service } from './service';

// The shared Start middleware (request ID, nonce CSP, server function log): @joeblew999/remy-ui/start.
export const startInstance = createStart(() => startMiddleware({ service, csp: { enforced: cspEnforced, reportPath: cspReportPath } }));
