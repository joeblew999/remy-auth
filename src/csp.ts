// The Content Security Policy's settings, in a module without Worker imports so the checks
// (tests/gui.spec.ts) read the same values the middleware (src/middleware.ts) uses.

/** Where browsers send Content Security Policy reports: the server route src/routes/csp-report.ts. */
export const cspReportPath = '/csp-report';

/**
 * The one switch for the nonce policy: true sends it as `Content-Security-Policy` (browsers block
 * what it forbids), false as `Content-Security-Policy-Report-Only` (browsers only report). Reports
 * go to cspReportPath either way. Enforced since the report-only period (.plans/gui-portal.md,
 * item 7); set false and redeploy to go back to reporting only.
 */
export const cspEnforced: boolean = true;
