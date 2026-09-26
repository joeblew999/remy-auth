import { env } from 'cloudflare:workers';
import { logContext, routeTemplate, writeLog } from './worker';

// Where browsers send Content Security Policy reports (the reportPath an app passes to startMiddleware): the
// Reporting API's batches (application/reports+json, `report-to`) and the older single report
// (application/csp-report, `report-uri`). One `csp_report` line in the shared log contract per
// violation: the directive, the disposition, the page's route template and what was blocked as a
// keyword (inline, eval, ...) or `external`. Like every log line, never a URL, sample or body.

const maxBytes = 64 * 1024;
const maxReports = 20;

type Violation = { directive?: unknown; disposition?: unknown; document?: unknown; blocked?: unknown };

function violations(body: unknown): Violation[] {
  if (Array.isArray(body)) {
    return body.filter(report => report?.type === 'csp-violation' && report.body).map(({ body: report }) => ({
      directive: report.effectiveDirective, disposition: report.disposition, document: report.documentURL, blocked: report.blockedURL }));
  }
  const report = (body as { 'csp-report'?: Record<string, unknown> } | null)?.['csp-report'];
  return report ? [{ directive: report['effective-directive'] ?? report['violated-directive'], disposition: report.disposition,
    document: report['document-uri'], blocked: report['blocked-uri'] }] : [];
}

const word = (value: unknown) => typeof value === 'string' && /^[a-z-]{1,40}$/.test(value) ? value : 'unknown';
const blockedKind = (value: unknown) => typeof value === 'string' && /^[a-z-]{1,20}$/.test(value) ? value : 'external';
function route(document: unknown) {
  try { return routeTemplate(new URL(String(document)).pathname, 200); } catch { return 'unknown'; }
}

/** The /csp-report route's handlers for a Worker's service: put them in the route's `server.handlers`. */
export const cspReport = (service: string) => ({
  POST: async ({ request, context }: { request: Request; context: { requestId: string } }) => {
    const text = await request.text();
    if (text.length > maxBytes) return new Response(null, { status: 413, headers: { 'Cache-Control': 'no-store' } });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
    for (const violation of violations(body).slice(0, maxReports)) {
      writeLog({ ...logContext(service, env, context.requestId, request.method), event: 'csp_report', level: 'warn',
        directive: word(violation.directive), disposition: word(violation.disposition), route: route(violation.document), blocked: blockedKind(violation.blocked) });
    }
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  },
  ANY: () => new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } }),
});
