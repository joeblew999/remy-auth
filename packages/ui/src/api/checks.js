// Checks for an app's contract-first API (.plans/openapi-contracts.md): coverage of the router,
// the generated OpenAPI document and its reference page. Plain JavaScript, like ../checks.js; requests are plain JSON over HTTP.
import { test, expect } from '@playwright/test';
import { oc } from '@orpc/contract';
import { z } from 'zod';
import { coverageProblems, procedures, routeOf, statusesOf } from './coverage.js';
import { guardProblems, policyOf } from './guard-core.js';
import { policy } from './policy.js';

/**
 * `router` is the app's implemented oRPC router (the one its /api route mounts). Every procedure
 * has a route, a policy and documented errors; the served document lists exactly those routes
 * with their error responses; the reference page points at it; unknown API paths are 404s.
 * `origins` are the registered apps' origins the API answers across origins (apiHandlers'
 * `origins`): each is allowed by name, on a simple call and on a preflight; any other origin is not.
 * `errorStatuses` are the HTTP statuses of the API's own error codes, as its server passes them.
 * `vocabulary` is the app's relation vocabulary, when procedures name its actions as their policy.
 * The guard (./guard-core.js): every procedure declares who may call it and has the guard in front of it,
 * nothing reachable without a session answers with a person (`personFields` adds the app's own
 * property names to the package's), and every procedure that needs a session refuses a stranger.
 */
export function apiChecks({ router, title, origins = [], personFields, errorStatuses, vocabulary }) {
  const statuses = statusesOf(errorStatuses);
  test('every API procedure is behind the guard, and none reachable without a session names a person', () => {
    expect(guardProblems(router, { ...(personFields ? { personFields } : {}), vocabulary })).toEqual([]);
    // The rule itself catches each gap, so an empty list above means something: a contract that
    // declares nothing, a public answer with an address in it, and a personal answer that does not say whose.
    const row = z.object({ team: z.string(), coach: z.object({ email: z.string() }) });
    const broken = {
      forgotten: oc.output(z.object({})),
      leaky: oc.meta(policy('public')).output(row),
      unexplained: oc.meta(policy('session')).output(row),
    };
    expect(guardProblems(broken)).toEqual([
      'forgotten: declares no policy (public, session or an action)',
      'leaky: reachable without a session, and its response carries email',
      'unexplained: its response carries email; say who receives them (personal)',
    ]);
  });

  test('every API procedure that needs a session refuses a caller without one, before answering anything', async ({ playwright, baseURL }) => {
    // A caller of its own, with no cookies: the test's shared request context may hold a session.
    const stranger = await playwright.request.newContext({ baseURL });
    for (const { path, procedure } of procedures(router)) {
      if (policyOf(procedure) === 'public') continue;
      const { method, path: route } = routeOf(procedure);
      const response = await stranger.fetch(route.replace(/\{[^}]+\}/g, 'x'), { method, ...(method === 'GET' ? {} : { data: {} }) });
      expect(response.status(), `${path}: ${method} ${route} without a session`).toBe(401);
      expect(response.headers()['cache-control'], `${path}: a refusal is never cached`).toBe('no-store');
      expect(await response.json(), path).toEqual({ defined: expect.any(Boolean), code: 'UNAUTHORIZED', message: expect.any(String) });
    }
    await stranger.dispose();
  });

  test('every API procedure has a route under /api/, a policy, an output and documented errors', () => {
    expect(coverageProblems(router, { errorStatuses })).toEqual([]);
    // The rule itself catches each gap, so an empty list above means something.
    const bare = {
      missing: oc.input(z.object({ id: z.string() })).output(z.object({})),
      unmapped: oc.errors({ OUT_OF_STOCK: {} }).output(z.object({})),
    };
    expect(coverageProblems(bare)).toEqual([
      'missing: no HTTP method', 'missing: no path under /api/', 'missing: no policy', 'missing: takes input but documents no error',
      'unmapped: no HTTP method', 'unmapped: no path under /api/', 'unmapped: undefined undefined is also missing', 'unmapped: no policy',
      'unmapped: error OUT_OF_STOCK has no HTTP error status', 'unmapped: error OUT_OF_STOCK has no message',
    ]);
  });

  test('the OpenAPI 3.1 document is generated from the router and served with its reference page', async ({ request }) => {
    const response = await request.get('/api/openapi.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const spec = await response.json();
    expect(spec.openapi).toMatch(/^3\.1\./);
    expect(spec.info.title).toBe(title);
    const expected = procedures(router).map(({ procedure }) => routeOf(procedure));
    const served = Object.entries(spec.paths).flatMap(([path, operations]) => Object.keys(operations).map(method => `${method.toUpperCase()} ${path}`));
    expect(served.sort()).toEqual(expected.map(route => `${route.method} ${route.path}`).sort());
    // oRPC hoists each error's schema into components.schemas; a response names it by $ref.
    const resolved = schema => JSON.stringify(schema ?? null, (_key, value) => (value?.$ref?.startsWith('#/components/schemas/') ? spec.components.schemas[value.$ref.split('/').pop()] : value));
    for (const { path, procedure } of procedures(router)) {
      const route = routeOf(procedure);
      const operation = spec.paths[route.path][route.method.toLowerCase()];
      expect(Object.keys(operation.responses), path).toContain('200');
      for (const code of Object.keys(procedure['~orpc'].errorMap)) {
        const body = operation.responses[String(statuses[code])]?.content?.['application/json']?.schema;
        expect(resolved(body), `${path} documents ${code}`).toContain(`"const":"${code}"`);
      }
    }

    // The reference page embeds the same document and loads the pinned Scalar script; opened as a
    // document it is not redirected to a localized URL (the API has no locale).
    const docs = await request.get('/api/doc', { headers: { 'Sec-Fetch-Dest': 'document' }, maxRedirects: 0 });
    expect(docs.status()).toBe(200);
    expect(docs.headers()['content-type']).toContain('text/html');
    const html = await docs.text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toMatch(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@scalar\/api-reference@\d+\.\d+\.\d+"><\/script>/);
    // oRPC escapes the embedded document for HTML: every slash is \u002F.
    for (const route of expected) expect(html, route.path).toContain(route.path.replaceAll('/', '\\u002F'));

    const missing = await request.get('/api/no-such-endpoint');
    expect(missing.status()).toBe(404);
    expect((await missing.json()).code).toBe('NOT_FOUND');
  });

  test('only the registered origins may call the API from their pages (CORS)', async ({ request }) => {
    const calls = procedures(router).map(({ procedure }) => routeOf(procedure));
    // A simple call needs an endpoint anyone may call: a stranger's GET of a public procedure.
    const get = calls.find((route, index) => route.method === 'GET' && policyOf(procedures(router)[index].procedure) === 'public');
    const other = 'https://not-registered.example';
    expect(origins, 'a registered origin is exact, never a wildcard').not.toContain('*');
    for (const origin of [...origins, other]) {
      const allowed = origin === other ? undefined : origin;
      // A simple call, as a page's fetch sends it: the answer names the origin only when registered,
      // and says it varies by Origin, so no cache hands one origin's answer to another.
      if (get) {
        const response = await request.get(get.path, { headers: { Origin: origin, 'Accept-Language': 'en' } });
        expect(response.status(), `${origin} GET ${get.path}`).toBe(200);
        expect(response.headers()['access-control-allow-origin'], `${origin} GET ${get.path}`).toBe(allowed);
        if (origins.length) expect(response.headers().vary, `${origin} GET ${get.path}`).toMatch(/\bOrigin\b/i);
      }
      // The preflight a page sends before a JSON POST.
      for (const route of calls.filter(route => route.method !== 'GET')) {
        const preflight = await request.fetch(route.path, { method: 'OPTIONS', headers: {
          Origin: origin, 'Access-Control-Request-Method': route.method, 'Access-Control-Request-Headers': 'content-type',
        } });
        expect(preflight.headers()['access-control-allow-origin'], `${origin} preflight ${route.method} ${route.path}`).toBe(allowed);
        if (allowed) {
          expect(preflight.status(), `${origin} preflight ${route.path}`).toBe(204);
          expect(preflight.headers()['access-control-allow-methods'], `${origin} preflight ${route.path}`).toContain(route.method);
        }
      }
    }
  });
}
