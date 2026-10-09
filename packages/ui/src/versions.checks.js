import { test, expect } from '@playwright/test';
import { baseLocale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { localizedPath } from './checks.js';

// What the app frame shows of the build (versions.tsx; what the Worker answers is build.checks.js),
// and whose name the pages carry. The app-check sets run these for every app. Plain JavaScript, like
// the platform's other checks.

export { buildChecks } from './build.checks.js';

/**
 * The app frame's build stamp (every app page has it): the build the page was made from, the
 * environment unless it is production, and the reload control only when the deployment answers
 * with another build than the page's, as it does for a tab left open across a deploy.
 */
export function buildStampChecks({ path }) {
  const o = { locale: baseLocale };
  const isHealth = response => new URL(response.url()).pathname === '/healthz';

  test('the app frame says which build this is, and offers the reload only when the deployment has moved on', async ({ page, request }) => {
    const deployment = await (await request.get('/healthz')).json();
    const stamp = page.locator('[data-build-stamp]');
    const reload = stamp.locator('[data-build="reload"]');

    let answered = page.waitForResponse(isHealth);
    await page.goto(localizedPath(path, baseLocale));
    await answered;
    await expect(stamp).toHaveAttribute('data-build-stamp', 'current');
    await expect(reload).toHaveCount(0);
    if (deployment.build.commit) await expect(stamp.locator('[data-build="commit"]')).toContainText(deployment.build.commit.slice(0, 7));
    await expect(stamp.locator('[data-build="changes"]')).toHaveCount(deployment.build.changes ? 1 : 0);
    // Which environment this is matters everywhere but production, where it would be noise.
    if (deployment.environment === 'production') await expect(stamp.locator('[data-build="environment"]')).toHaveCount(0);
    else await expect(stamp.locator('[data-build="environment"]')).toHaveText(deployment.environment);

    // The deployment now answers with another build: this page is running code that was replaced.
    await page.route('**/healthz', async route => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({ response, json: { ...body, build: { ...body.build, commit: 'f'.repeat(40), changes: '' } } });
    });
    answered = page.waitForResponse(isHealth);
    await page.reload();
    await answered;
    await expect(stamp).toHaveAttribute('data-build-stamp', 'stale');
    await expect(reload).toHaveText(m.build_update({}, o));
    // The control reloads the page; nothing reloads it by itself.
    await Promise.all([page.waitForEvent('load'), reload.click()]);
  });
}

/** The platform's own name: the prototype's, which an app of another name must never show. */
const platformName = /\bRemy\b/;

/**
 * The product's name is the app's (defineRemyApp's `brand`), everywhere a person reads it: every
 * page's title ends with it, and unless the app itself is called that, no page says the platform's
 * name. Checked in English: the other catalogs take the name the same way, as `{product}`, and the
 * translation check (i18n:check) fails a translation that loses a placeholder.
 */
export function productNameChecks({ paths }) {
  test("every page carries the app's own name, and an app of another name never shows the platform's", async ({ page }) => {
    let brand;
    for (const path of paths) {
      await page.goto(localizedPath(path, baseLocale));
      await expect(page.locator('.brand').first()).not.toHaveText('');
      brand ??= (await page.locator('.brand').first().textContent()).trim();
      await expect(page.locator('.brand').first(), path).toHaveText(brand);
      await expect(page, path).toHaveTitle(new RegExp(` \\| ${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      if (platformName.test(brand)) continue;
      const shown = await page.evaluate(() => [document.title, document.body.innerText,
        ...[...document.querySelectorAll('meta[name="description"], script[type="application/ld+json"]')].map(node => node.getAttribute('content') ?? node.textContent)].join('\n'));
      expect(shown.split('\n').filter(line => platformName.test(line)), `${path} names the platform`).toEqual([]);
    }
  });
}
