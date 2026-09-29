import { createStart } from '@tanstack/react-start';
import { startMiddleware } from '@joeblew999/remy-ui/start';
import { service } from './service';

// The shared Start middleware (request ID, the nonce CSP enforced and reporting to the package's /csp-report,
// the server function log): @joeblew999/remy-ui/start. To report only, pass csp: { enforced: false, reportPath:
// '/csp-report' } here and cspEnforced: false to serverAppChecks (tests/gui.spec.ts).
export const startInstance = createStart(() => startMiddleware({ service }));
