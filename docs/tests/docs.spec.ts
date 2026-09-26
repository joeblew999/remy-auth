import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// What is ours in the docs Worker (Fumadocs is tested by Fumadocs): the head search engines read
// (<html lang>, canonical, hreflang: src/docs/page.ts), Ask AI's chat route (src/routes/api/chat.$site.ts),
// and a smoke pass: every sitemap page answers, and pages hydrate without errors or CSP violations.

const langOf = (path: string) => {
  const [, site, second] = path.split('/');
  if (site !== 'docs' && site !== 'dev') return 'en';
  const { defaultLanguage, languages } = JSON.parse(readFileSync(new URL(`../content/${site === 'docs' ? 'users' : 'dev'}/i18n.json`, import.meta.url), 'utf8'));
  return second && languages.includes(second) ? second : defaultLanguage;
};
const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1];

test('every sitemap page answers in its own language, canonical to itself, with the sitemap\'s alternates', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)];
  expect(entries.length).toBeGreaterThan(10);
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

for (const site of ['docs', 'dev']) {
  test(`${site}: Ask AI answers, or says it cannot, as the panel's stream`, async ({ request }) => {
    const response = await request.post(`/api/chat/${site}?lang=en`, {
      data: { id: 'check', messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'What is this?' }] }] },
    });
    expect(response.headers()['content-type']).toContain('text/event-stream');
    expect(await response.text()).toContain('"type":"text-delta"');
  });
}

// One test per page, so they run at the same time.
for (const path of ['/docs/formats', '/dev/es/how-we-work', '/docs/ask', '/reference/reservations.create']) {
  test(`${path} hydrates with no errors and no Content-Security-Policy violations`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
