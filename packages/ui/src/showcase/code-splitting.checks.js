// Code splitting, checked in the browser: TanStack Start's router plugin splits every route's
// component into its own chunk (autoCodeSplitting, always on in Start), so a page's first load
// carries no other route's code, and an in-app navigation fetches the next route's chunk on demand.
import { test, expect } from '@playwright/test';
import { baseLocale } from '../paraglide/runtime.js';
import { localizedPath, hydrated } from '../checks.js';

const isScript = url => /\.m?js(?:\?|$)/.test(new URL(url).pathname + new URL(url).search);

/** Loads `path` in a fresh context and returns every script URL fetched until the network is idle. */
async function firstLoad(browser, path) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const scripts = new Set();
  page.on('request', request => { if (isScript(request.url())) scripts.add(request.url()); });
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await page.waitForLoadState('networkidle');
  await context.close();
  return scripts;
}

/**
 * For every public path other than `home`: loading it directly fetches code the home page's first
 * load never fetched, and clicking its in-app link on the home page fetches that code on demand,
 * as a client-side navigation (no document request) that loads nothing outside the route's own code.
 */
export function codeSplittingChecks({ paths, home = '' }) {
  test(`from ${home || 'the site home'}, each route's code stays out of the first load and loads on demand when navigated to`, async ({ browser }) => {
    const homePath = localizedPath(home, baseLocale);
    const targets = paths.filter(path => path !== home).map(path => localizedPath(path, baseLocale));
    const [homeScripts, ...direct] = await Promise.all([homePath, ...targets].map(path => firstLoad(browser, path)));
    expect(homeScripts.size, 'the home page loads scripts').toBeGreaterThan(0);

    const context = await browser.newContext();
    const page = await context.newPage();
    const documents = [];
    let later = [];
    page.on('request', request => {
      if (request.resourceType() === 'document') documents.push(request.url());
      else if (isScript(request.url())) later.push(request.url());
    });
    await page.goto(homePath);
    await page.waitForLoadState('networkidle');
    const visit = async target => {
      const link = page.locator(`a[href="${target}"]`).first();
      await hydrated(link);
      later = [];
      await link.click();
      await expect(page).toHaveURL(url => url.pathname === target);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
    };
    documents.length = 0;
    for (const [index, target] of targets.entries()) {
      const own = [...direct[index]].filter(url => !homeScripts.has(url));
      expect(own.length, `${target} has its own chunk, absent from the home page's first load`).toBeGreaterThan(0);
      await visit(target);
      expect(later.length, `navigating to ${target} fetches its chunk on demand`).toBeGreaterThan(0);
      for (const url of later) expect(own, `${url} fetched on navigation belongs to ${target}`).toContain(url);
      await visit(homePath);
    }
    expect(documents, 'every navigation stayed in the app').toEqual([]);
    await context.close();
  });
}
