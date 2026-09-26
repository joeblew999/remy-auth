# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lighthouse.spec.ts >> lighthouse >> desktop: /reference/reservations.create passes every audit
- Location: ../packages/ui/src/checks.js:411:7

# Error details

```
Error: See the lighthouse.html attachment in the HTML report

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "button-name: Buttons do not have an accessible name",
+   "agent-accessibility-tree: Accessibility tree is not well-formed",
+ ]
```

# Test source

```ts
  324 |  * with its "for this language" card, and every control offers the page's language's own values
  325 |  * first (marked), then every other locale's, all from locale-data.js: a new locale needs no edit
  326 |  * here. `extra` checks an app's additional rows.
  327 |  */
  328 | export function formatsChecks({ extra } = {}) {
  329 |   for (const locale of checkedLocales) {
  330 |     const o = { locale };
  331 |     test(`${locale}: formats page matches this language's Intl output without JavaScript`, async ({ browser, baseURL }) => {
  332 |       const context = await browser.newContext({ javaScriptEnabled: false });
  333 |       const page = await context.newPage();
  334 |       expect((await page.goto(`${baseURL}${localizedPath('/formats', locale)}`))?.status()).toBe(200);
  335 |       await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}${localizedPath('/formats', locale)}`);
  336 |       await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `${baseURL}/formats`);
  337 |       await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.formats_title({}, o));
  338 |       // Formatted with the explicit tag (the language's own calendar and digits): the rows written
  339 |       // by Paraglide's messages use the plain locale, so they match only if the runtime's defaults
  340 |       // are the language's own, which is the claim (a Persian page shows the Persian calendar).
  341 |       const format = formatTag(locale);
  342 |       const resolved = new Intl.DateTimeFormat(format, { hour: 'numeric' }).resolvedOptions();
  343 |       const tag = new Intl.Locale(locale);
  344 |       const numbering = tag.getNumberingSystems()[0];
  345 |       const { firstDay, weekend } = tag.getWeekInfo();
  346 |       const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  347 |       const titleWords = [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(m.home_title({}, o))].filter(part => part.isWordLike).map(part => part.segment);
  348 |       const expected = {
  349 |         tag: locale,
  350 |         name: endonym(locale),
  351 |         direction: direction(locale) === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o),
  352 |         languages: new Intl.ListFormat(locale, { type: 'conjunction' }).format(locales.map(endonym)),
  353 |         calendar: new Intl.DisplayNames([locale], { type: 'calendar' }).of(tag.getCalendars()[0]),
  354 |         numbering: `${numbering} · ${new Intl.NumberFormat(format).format(samples.decimal)}`,
  355 |         'hour-cycle': ['h11', 'h12'].includes(resolved.hourCycle ?? '') ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o),
  356 |         'week-start': weekday(locale, firstDay),
  357 |         weekend: list.format(weekend.map(day => weekday(locale, day))),
  358 |         instant: new Intl.DateTimeFormat(format, { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }).format(samples.instant),
  359 |         date: new Intl.DateTimeFormat(format, { dateStyle: 'long', timeZone: 'UTC' }).format(samples.date),
  360 |         relative: new Intl.RelativeTimeFormat(format, { numeric: 'auto' }).format(samples.days, 'day'),
  361 |         decimal: new Intl.NumberFormat(format).format(samples.decimal),
  362 |         percent: new Intl.NumberFormat(format, { style: 'percent' }).format(samples.share),
  363 |         compact: new Intl.NumberFormat(format, { notation: 'compact' }).format(samples.big),
  364 |         currency: new Intl.NumberFormat(format, { style: 'currency', currency: ownValues(locale).currency }).format(samples.amount),
  365 |         'plural-forms': list.format(ownValues(locale).counts.map(count => m.apps_count({ count }, o))),
  366 |         casing: samples.casing,
  367 |         'word-count': new Intl.NumberFormat(format).format(titleWords.length),
  368 |         'long-word': samples.longWord,
  369 |       };
  370 |       for (const [sample, text] of Object.entries(expected)) await expect(page.locator(`[data-sample="${sample}"]`), sample).toHaveText(text);
  371 |       for (const count of samples.counts) await expect(page.locator(`[data-count="${count}"]`)).toHaveText(m.apps_count({ count }, o));
  372 |       for (const n of samples.positions) await expect(page.locator(`[data-position="${n}"]`)).toHaveText(m.position_value({ n }, o));
  373 |       // Counts and positions inside sentences use the language's own digits too, as the number rows do.
  374 |       for (const node of await page.locator('[data-count], [data-position]').all()) expect(foreignDigits(await node.innerText(), locale), await node.innerText()).toEqual([]);
  375 |       // The week in this locale's order from its first day, its weekend marked (Intl Locale Info's getWeekInfo).
  376 |       const days = Array.from({ length: 7 }, (_, index) => ((firstDay - 1 + index) % 7) + 1);
  377 |       await expect(page.locator('[data-weekday]')).toHaveText(days.map(day => weekday(locale, day, 'short')));
  378 |       expect(await page.locator('[data-weekday]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.weekday)))).toEqual(days);
  379 |       expect(await page.locator('[data-weekend]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.weekday)))).toEqual(days.filter(day => weekend.includes(day)));
  380 |       // Words as Intl.Segmenter divides them, also for languages written without spaces.
  381 |       await expect(page.locator('[data-word]')).toHaveText(titleWords);
  382 |       // Every section opens with its "for this language" card.
  383 |       for (const area of formatsAreas) await expect(page.locator(`section#${area} > div.grid > :first-child`), area).toHaveAttribute('data-own-area', area);
  384 |       // Every control: this language's own values first and marked, then every other locale's, as links (static labels on a prerendered page) without JavaScript.
  385 |       for (const kind of choiceKinds) {
  386 |         const { own, others } = choicesFor(locale, kind);
  387 |         const items = page.locator(`[data-choices="${kind}"] li`);
  388 |         expect(await items.evaluateAll(nodes => nodes.map(node => node.dataset.choiceValue)), kind).toEqual([...own, ...others].map(String));
  389 |         expect(await items.evaluateAll(nodes => nodes.filter(node => node.hasAttribute('data-own')).map(node => node.dataset.choiceValue)), kind).toEqual(own.map(String));
  390 |       }
  391 |       await extra?.(page, locale);
  392 |       await context.close();
  393 |     });
  394 |   }
  395 | }
  396 | 
  397 | /**
  398 |  * Google Lighthouse through the pinned Chrome DevTools CLI against the same target as the other
  399 |  * checks. The CLI runs accessibility, SEO, best-practices and agentic-browsing; upstream excludes
  400 |  * Performance by design. Every scored audit must pass, not only the category score; none is exempt.
  401 |  */
  402 | export function lighthouseChecks({ pages }) {
  403 |   // npx --no-install finds the pinned binary from any workspace (a docs app's bins are hoisted to the root).
  404 |   const cli = (...args) => execFileSync('npx', ['--no-install', 'chrome-devtools', ...args],
  405 |     { encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' }, timeout: 120_000 });
  406 |   test.describe('lighthouse', () => {
  407 |     test.describe.configure({ mode: 'serial', timeout: 120_000 });
  408 |     test.beforeAll(() => { cli('start', '--isolated', '--headless', '--no-usage-statistics', '--no-performance-crux'); });
  409 |     test.afterAll(() => { cli('stop'); });
  410 |     for (const { path, device } of pages) {
  411 |       test(`${device}: ${path} passes every audit`, async ({ baseURL }, testInfo) => {
  412 |         const dir = testInfo.outputPath('lighthouse');
  413 |         rmSync(dir, { recursive: true, force: true });
  414 |         if (process.env.COLOR_SCHEME) cli('emulate', '1', '--colorScheme', process.env.COLOR_SCHEME);
  415 |         cli('navigate_page', '1', '--url', `${baseURL}${path}`);
  416 |         cli('lighthouse_audit', '1', '--device', device, '--output-format', 'json', '--outputDirPath', dir);
  417 |         const report = JSON.parse(readFileSync(`${dir}/report.json`, 'utf8'));
  418 |         expect(report.finalDisplayedUrl).toBe(`${baseURL}${path}`);
  419 |         const failures = Object.values(report.categories).flatMap(category => category.auditRefs)
  420 |           .map(ref => report.audits[ref.id])
  421 |           .filter(audit => audit.score !== null && audit.score < 1)
  422 |           .map(audit => `${audit.id}: ${audit.title}`);
  423 |         await testInfo.attach('lighthouse.html', { path: `${dir}/report.html`, contentType: 'text/html' });
> 424 |         expect([...new Set(failures)], 'See the lighthouse.html attachment in the HTML report').toEqual([]);
      |                                                                                                 ^ Error: See the lighthouse.html attachment in the HTML report
  425 |       });
  426 |     }
  427 |   });
  428 | }
  429 | 
  430 | /**
  431 |  * Core Web Vitals through Google's own `lighthouse` package (the Chrome DevTools CLI excludes
  432 |  * the Performance category), driving Playwright's Chrome over a debugging port. The gate is
  433 |  * Google's published "good" thresholds for the lab metrics and a Performance score of at least
  434 |  * 0.9; every failing audit is in the attached report. One run varies by hundreds of milliseconds, so
  435 |  * each page runs `runs` times and Lighthouse's own computeMedianRun picks the run that is judged, as
  436 |  * Lighthouse's variability guidance advises (github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).
  437 |  * Call it from tests/performance.spec.ts, which
  438 |  * the shared Playwright config runs alone after all other checks. Tighten `thresholds` per project if needed.
  439 |  */
  440 | export function performanceChecks({ pages, thresholds = {}, runs = 5 }) {
  441 |   const limits = { score: 0.9, lcp: 2500, cls: 0.1, tbt: 200, ...thresholds };
  442 |   test.describe('core web vitals', () => {
  443 |     test.describe.configure({ mode: 'serial', timeout: 600_000 });
  444 |     const port = 9222 + Math.floor(Math.random() * 1000);
  445 |     let browser, puppeteerBrowser;
  446 |     test.beforeAll(async () => {
  447 |       browser = await chromium.launch({ channel: 'chrome', args: [`--remote-debugging-port=${port}`] });
  448 |       // Lighthouse bundles puppeteer-core; connecting it to the same Chrome lets Lighthouse drive a
  449 |       // fresh page. Never warm the page first: a visitor's first load in a new tab is cold, and a
  450 |       // warm-up once hid a multi-second font stall that real visitors paid.
  451 |       const puppeteer = await import('puppeteer-core');
  452 |       puppeteerBrowser = await puppeteer.default.connect({ browserURL: `http://127.0.0.1:${port}` });
  453 |     });
  454 |     test.afterAll(async () => { await puppeteerBrowser?.disconnect(); await browser?.close(); });
  455 |     for (const { path, device } of pages) {
  456 |       test(`${device}: ${path} meets Google's good thresholds`, async ({ baseURL }, testInfo) => {
  457 |         const { navigation, desktopConfig, generateReport } = await import('lighthouse');
  458 |         const { computeMedianRun } = await import('lighthouse/core/lib/median-run.js');
  459 |         const lhrs = [];
  460 |         for (let run = 0; run < runs; run++) {
  461 |           const page = await puppeteerBrowser.newPage();
  462 |           const result = await navigation(page, `${baseURL}${path}`, {
  463 |             flags: { output: 'json', logLevel: 'error', onlyCategories: ['performance'] },
  464 |             config: device === 'desktop' ? desktopConfig : undefined,
  465 |           });
  466 |           await page.close();
  467 |           lhrs.push(result.lhr);
  468 |         }
  469 |         const lhr = computeMedianRun(lhrs);
  470 |         await testInfo.attach('runs.txt', { body: lhrs.map(run => `LCP ${Math.round(run.audits['largest-contentful-paint'].numericValue)} ms, score ${run.categories.performance.score}`).join('\n'), contentType: 'text/plain' });
  471 |         await testInfo.attach('performance.html', { body: generateReport(lhr, 'html'), contentType: 'text/html' });
  472 |         expect(lhr.finalDisplayedUrl).toBe(`${baseURL}${path}`);
  473 |         const metrics = lhr.audits.metrics.details.items[0];
  474 |         const score = lhr.categories.performance.score;
  475 |         const failures = [];
  476 |         if (score < limits.score) failures.push(`performance score ${score} < ${limits.score}`);
  477 |         if (metrics.largestContentfulPaint > limits.lcp) failures.push(`LCP ${Math.round(metrics.largestContentfulPaint)} ms > ${limits.lcp} ms`);
  478 |         if (metrics.cumulativeLayoutShift > limits.cls) failures.push(`CLS ${metrics.cumulativeLayoutShift} > ${limits.cls}`);
  479 |         if (metrics.totalBlockingTime > limits.tbt) failures.push(`TBT ${Math.round(metrics.totalBlockingTime)} ms > ${limits.tbt} ms`);
  480 |         expect(failures, 'See the performance.html attachment in the HTML report').toEqual([]);
  481 |       });
  482 |     }
  483 |   });
  484 | }
  485 | 
  486 | /**
  487 |  * The two kinds of page stay apart (paths.js): every site page is complete in the server's HTML
  488 |  * without JavaScript, indexable and labelled as a site page; every app page carries noindex, stays
  489 |  * out of the sitemap and is labelled as the app once it runs.
  490 |  */
  491 | export function zoneChecks({ sitePaths, appPaths }) {
  492 |   // One test per language, as the other per-language checks: the work grows with the language count.
  493 |   for (const locale of checkedLocales) test(`${locale}: site pages work without JavaScript, are indexable and say so`, async ({ browser }) => {
  494 |     const context = await browser.newContext({ javaScriptEnabled: false });
  495 |     const page = await context.newPage();
  496 |     for (const path of sitePaths) {
  497 |       const url = localizedPath(path, locale);
  498 |       expect((await page.goto(url))?.status(), url).toBe(200);
  499 |       await expect(page.getByRole('heading', { level: 1 }), url).toBeVisible();
  500 |       await expect(page.locator('[data-zone="site"]'), url).toHaveText(m.zone_site({}, { locale }));
  501 |       await expect(page.locator('meta[name="robots"]'), url).toHaveCount(0);
  502 |       // Structured data belongs to the site home page only (publicPageChecks).
  503 |       if (path !== '') await expect(page.locator('script[type="application/ld+json"]'), url).toHaveCount(0);
  504 |     }
  505 |     await context.close();
  506 |   });
  507 | 
  508 |   // One test per language, as the other per-language checks: the work grows with the language count.
  509 |   for (const locale of checkedLocales) {
  510 |     test(`${locale}: app pages are kept out of search and say they are the app`, async ({ page, request }) => {
  511 |       const sitemap = await (await request.get('/sitemap.xml')).text();
  512 |       for (const path of appPaths) {
  513 |         const url = localizedPath(path, locale);
  514 |         const response = await request.get(url);
  515 |         expect(response.status(), url).toBe(200);
  516 |         const html = await response.text();
  517 |         // TanStack Router puts the request's CSP nonce, when there is one, on every head tag it renders.
  518 |         expect(html, url).toMatch(/<meta name="robots" content="noindex"(?: nonce="[^"]+")?\/>/);
  519 |         expect(html, url).not.toContain('application/ld+json');
  520 |         expect(sitemap, url).not.toContain(`${url}<`);
  521 |         await page.goto(url);
  522 |         await expect(page.locator('[data-zone="app"]'), url).toHaveText(m.zone_app({}, { locale }));
  523 |       }
  524 |     });
```