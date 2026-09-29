import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// What is ours in the docs Worker (Fumadocs is tested by Fumadocs): the head search engines read
// (<html lang>, canonical, hreflang: docs/page.ts), Ask AI's chat route (routes/api/chat.$site.ts) when the
// app has Ask AI, and a smoke pass: every sitemap page answers, and pages hydrate without errors or CSP
// violations. Run from an app's docs/ (docs:test): every page list comes from its own content/, never
// from remy-auth's pages.

const content = (file: string) => JSON.parse(readFileSync(join(process.cwd(), 'content', file), 'utf8'));
const folder = { docs: 'users', dev: 'dev' } as const;
const { docsConfig } = await import(pathToFileURL(join(process.cwd(), 'docs.config.ts')).href);

const langOf = (path: string) => {
  const [, site, second] = path.split('/');
  if (site !== 'docs' && site !== 'dev') return 'en';
  const { defaultLanguage, languages } = content(`${folder[site]}/i18n.json`);
  return second && languages.includes(second) ? second : defaultLanguage;
};

/**
 * Pages to hydrate, from each site's meta.json: its first page after the index, and that page's first
 * translation. Not the index pages: remy-auth's /dev index hits a Fumadocs hydration mismatch (its contents
 * popover shows the active heading on the client only, React #418, live since before thin-apps), parked in
 * .plans/thin-apps.md ("Parked while running").
 */
const hydratePaths = (['docs', 'dev'] as const).flatMap(site => {
  const { pages } = content(`${folder[site]}/meta.json`) as { pages: string[] };
  const { defaultLanguage, languages } = content(`${folder[site]}/i18n.json`) as { defaultLanguage: string; languages: string[] };
  const first = pages.find(page => page !== 'index' && !page.startsWith('[') && !page.startsWith('---'));
  const translated = first && languages.find(lang => lang !== defaultLanguage &&
    ['md', 'mdx'].some(ext => existsSync(join(process.cwd(), 'content', folder[site], `${first}.${lang}.${ext}`))));
  return [...(first ? [`/${site}/${first}`] : [`/${site}`]), ...(translated ? [`/${site}/${translated}/${first}`] : [])];
});
const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1];

test('every sitemap page answers in its own language, canonical to itself, with the sitemap\'s alternates', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)];
  expect(entries.length).toBeGreaterThan(0);
  // In parallel: the pages are independent, and one after another over the network was most of the time.
  await Promise.all(entries.map(async ([, loc, rest]) => {
    const path = new URL(loc!).pathname;
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(attr(html, /<html[^>]*lang="([^"]+)"/), `${path} lang`).toBe(langOf(path));
    expect(attr(html, /rel="canonical"[^>]*href="([^"]+)"/), `${path} canonical`).toBe(loc);
    const alternates = [...rest!.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => `${lang} ${href}`);
    const onPage = [...html.matchAll(/rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => `${lang} ${href}`);
    expect(onPage, `${path} hreflang`).toEqual(alternates);
  }));
});

for (const site of docsConfig.ask ? ['docs', 'dev'] : []) {
  test(`${site}: Ask AI answers, or says it cannot, as the panel's stream`, async ({ request }) => {
    const response = await request.post(`/api/chat/${site}?lang=en`, {
      data: { id: 'check', messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'What is this?' }] }] },
    });
    expect(response.headers()['content-type']).toContain('text/event-stream');
    expect(await response.text()).toContain('"type":"text-delta"');
  });
}

// One test per page, so they run at the same time.
for (const path of [...hydratePaths, '/reference', ...(docsConfig.ask ? ['/docs/ask'] : [])]) {
  test(`${path} hydrates with no errors and no Content-Security-Policy violations`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
