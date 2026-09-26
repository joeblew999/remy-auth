import { createStart } from '@tanstack/react-start';
import { startMiddleware } from '@joeblew999/remy-ui/start';
import { service } from './service';

// The shared Start middleware (request ID, nonce CSP, server function log), as the app runs it.
export const startInstance = createStart(() => startMiddleware({ service, csp: { enforced: true, reportPath: '/csp-report' } }));
