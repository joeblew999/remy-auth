import { test, expect } from '@playwright/test';
import { localizedPath } from '@joeblew999/remy-ui/checks';
import { smokeChecks } from '@joeblew999/remy-ui/smoke';
import { appPagePaths, askPath, docsSearchPath, siteAndDocsPaths } from '../src/paths';

// Tier 1, smoke (mise project:test:smoke): the package's smoke checks over this app's pages, plus this
// app's own docs: search finds a page, and asking answers or says it cannot (locally the AI is off).
smokeChecks({ sitePaths: siteAndDocsPaths, appPaths: appPagePaths, hydrate: ['', '/docs/tooling'] });

test('smoke: search finds a docs page and asking answers or says it cannot', async ({ request }) => {
  const search = await (await request.get(`${localizedPath(docsSearchPath, 'en')}?q=deploy`)).text();
  expect(search).toMatch(/href="\/en\/docs[^"]*"/);
  const ask = await (await request.get(`${localizedPath(askPath, 'en')}?q=${encodeURIComponent('How do I deploy?')}`)).text();
  expect(ask).toMatch(/data-ask="(answered|no-answer)"/);
});
