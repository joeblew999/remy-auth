import { test, expect } from '@playwright/test';
import { collectErrors, hydrated, localizedPath } from '@joeblew999/remy-ui/checks';
import { appPagePaths, askPath, docsSearchPath, siteAndDocsPaths } from '../src/paths';

// Tier 1, smoke (mise project:test:smoke, ~15 s): the few things that break when something big breaks.
// Every page answers in English and Arabic with a heading; the home and a docs page hydrate without an
// error; search finds a page; asking gives an answer or its "no answer" (locally the AI is off). The
// full checks stay in the other specs, for the quick tier, a targeted run (project:test:only) and releases.
const locales = ['en', 'ar'];

for (const locale of locales) {
  test(`smoke ${locale}: every page answers 200, site and docs pages with a heading in the server's HTML`, async ({ request }) => {
    for (const path of [...siteAndDocsPaths, ...appPagePaths]) {
      const url = localizedPath(path, locale);
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      // App pages are drawn in the browser; site and docs pages arrive complete.
      if (siteAndDocsPaths.includes(path)) expect(await response.text(), url).toMatch(/<h1[\s>]/);
    }
  });

  test(`smoke ${locale}: the home and a docs page hydrate without errors`, async ({ page }) => {
    const errors = collectErrors(page);
    for (const path of ['', '/docs/tooling']) {
      await page.goto(localizedPath(path, locale));
      await hydrated(page.locator('body'));
    }
    expect(errors).toEqual([]);
  });
}

test('smoke: search finds a docs page and asking answers or says it cannot', async ({ request }) => {
  const search = await (await request.get(`${localizedPath(docsSearchPath, 'en')}?q=deploy`)).text();
  expect(search).toMatch(/href="\/en\/docs[^"]*"/);
  const ask = await (await request.get(`${localizedPath(askPath, 'en')}?q=${encodeURIComponent('How do I deploy?')}`)).text();
  expect(ask).toMatch(/data-ask="(answered|no-answer)"/);
});
