import { test, expect } from '@playwright/test';
import { collectErrors, hydrated, localizedPath } from './checks.js';

/**
 * Tier 1, smoke (mise project:test:smoke, seconds): the few things that break when something big
 * breaks, for any app on this package. In each language given (default English and Arabic: left to
 * right and right to left), every page answers 200, site pages with a heading in the server's HTML (app
 * pages are drawn in the browser), and the pages in `hydrate` hydrate without an error. The full checks
 * stay in the package's other sets, for the quick tier, targeted runs and releases.
 */
export function smokeChecks({ sitePaths, appPaths, hydrate = [''], locales = ['en', 'ar'] }) {
  for (const locale of locales) {
    test(`smoke ${locale}: every page answers 200, site pages with a heading in the server's HTML`, async ({ request }) => {
      for (const path of [...sitePaths, ...appPaths]) {
        const url = localizedPath(path, locale);
        const response = await request.get(url);
        expect(response.status(), url).toBe(200);
        if (sitePaths.includes(path)) expect(await response.text(), url).toMatch(/<h1[\s>]/);
      }
    });

    test(`smoke ${locale}: ${hydrate.map(path => path || '/').join(', ')} hydrate without errors`, async ({ page }) => {
      const errors = collectErrors(page);
      for (const path of hydrate) {
        await page.goto(localizedPath(path, locale));
        await hydrated(page.locator('body'));
      }
      expect(errors).toEqual([]);
    });
  }
}
