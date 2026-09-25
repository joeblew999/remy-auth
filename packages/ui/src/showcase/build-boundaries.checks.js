// Execution boundaries, checked on the production artifact: every script a browser can download
// from the app (each localized public page's scripts and everything they import, statically or
// on demand) is free of server-only code and of devtools. Works against the local artifact and a
// deployed URL alike; locally it also proves the crawl reached every script in the build output.
import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locales } from '../paraglide/runtime.js';
import { localizedPath, checkedLocales } from '../checks.js';

const own = file => new URL(`../${file}`, import.meta.url);

/**
 * Code that must only ever run in the Worker. Each marker is a string that survives minification,
 * and `source` is where it lives: the check first proves the marker really occurs there, so a
 * renamed string cannot turn the check into a silent pass.
 */
export const serverOnlyMarkers = [
  { name: "Paraglide's server middleware (paraglideMiddleware)", pattern: /Sec-Fetch-Dest/, source: own('paraglide/server.js') },
  { name: "Node's async context (async_hooks)", pattern: /\basync_hooks\b/, source: own('paraglide/server.js') },
  { name: "Start's request context (getRequest)", pattern: /No StartEvent found in AsyncLocalStorage/, source: { package: '@tanstack/start-server-core', from: '@tanstack/react-start' } },
  { name: "Cloudflare's request geolocation (placeFromCloudflare)", pattern: /\^\[A-Z\]\{2\}\$/, source: own('cloudflare.ts') },
  { name: 'The observability wrapper (withObservability)', pattern: /unhandled_exception/, source: own('worker.ts') },
];

/** Development-only tools that must never reach a production bundle. */
export const devtoolsMarkers = [
  { name: 'TanStack Router devtools', pattern: /--tsrd-|Devtools is (?:already|not) mounted/, source: { package: '@tanstack/router-devtools-core', from: '@tanstack/react-router-devtools' } },
  { name: 'TanStack Query devtools', pattern: /Tanstack query devtools|tsqd-/, source: { package: '@tanstack/query-devtools', from: '@tanstack/react-query-devtools' } },
];

/** The installed package's root directory, resolved from the app (or through the package that depends on it). */
function packageRoot(name, from) {
  let dir = from ? packageRoot(from) : process.cwd();
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`${name} is not installed; install it or drop its marker`);
    dir = parent;
  }
}

/** Every JavaScript file under `dir`, skipping nested node_modules and source maps. */
function scriptsIn(dir) {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (entry === 'node_modules') return [];
    if (statSync(path).isDirectory()) return scriptsIn(path);
    return /\.(?:[cm]?js|tsx?)$/.test(entry) ? [path] : [];
  });
}

function sourceText(source) {
  if (source instanceof URL) return readFileSync(fileURLToPath(source), 'utf8');
  if (typeof source === 'string') return readFileSync(join(process.cwd(), source), 'utf8');
  return scriptsIn(packageRoot(source.package, source.from)).map(path => readFileSync(path, 'utf8')).join('\n');
}

/** Script URLs a text references: module specifiers, dynamic imports, script src and modulepreload hrefs. */
const references = text => [...text.matchAll(/["'`]((?:\.{1,2}\/|\/)[^"'`\s<>]*?\.m?js)(?:\?[^"'`\s<>]*)?["'`]/g)].map(match => match[1]);

/** Fetches every same-origin script reachable from the pages, following imports transitively. */
async function crawl(request, baseURL, pages) {
  const origin = new URL(baseURL).origin;
  const scripts = new Map();
  const queue = [];
  const add = (reference, base) => {
    const url = new URL(reference, base);
    url.hash = '';
    if (url.origin !== origin || scripts.has(url.href)) return;
    scripts.set(url.href, '');
    queue.push(url.href);
  };
  for (const path of pages) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    for (const reference of references(await response.text())) add(reference, response.url());
  }
  while (queue.length) {
    const url = queue.shift();
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    const text = await response.text();
    scripts.set(url, text);
    for (const reference of references(text)) add(reference, url);
  }
  return scripts;
}

/**
 * The browser never receives server-only code or devtools: crawls the scripts of every localized
 * public path and fails on any marker. `markers` adds app-specific ones (a `source` string is a
 * path relative to the app). `clientDir` is the build's client output, checked for completeness
 * when testing the local artifact.
 */
export function buildBoundaryChecks({ paths, markers = [], clientDir = 'dist/client' }) {
  test('the browser never downloads server-only code or devtools', async ({ request, baseURL }) => {
    const all = [...serverOnlyMarkers, ...devtoolsMarkers, ...markers];
    for (const { name, pattern, source } of all) expect(sourceText(source), `the "${name}" marker occurs in its source`).toMatch(pattern);

    const scripts = await crawl(request, baseURL, locales.flatMap(locale => paths.map(path => localizedPath(path, locale))));
    expect(scripts.size, 'the pages load scripts').toBeGreaterThan(1);
    if (process.env.TEST_TARGET !== 'remote') {
      const built = scriptsIn(join(process.cwd(), clientDir)).map(path => `/${path.slice(join(process.cwd(), clientDir).length + 1)}`);
      expect(built.length, `${clientDir} holds the production client build`).toBeGreaterThan(0);
      const crawled = new Set([...scripts.keys()].map(url => new URL(url).pathname));
      for (const path of built) expect(crawled.has(path), `${path} is reachable from a public page`).toBe(true);
    }
    for (const [url, text] of scripts) {
      expect(new URL(url).pathname, 'no devtools chunk').not.toMatch(/devtools/i);
      for (const { name, pattern } of all) expect(pattern.test(text), `${name} in ${url}`).toBe(false);
    }
  });

  // The other direction: the device's own time is browser-only, so the server's HTML leaves it
  // empty and the browser fills it after hydration (the formats checks assert the filled value).
  test('the device time is rendered by the browser only', async ({ request }) => {
    for (const locale of checkedLocales) {
      const path = localizedPath('/formats', locale);
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toMatch(/<span[^>]*data-sample="local"[^>]*><\/span>/);
    }
  });
}
