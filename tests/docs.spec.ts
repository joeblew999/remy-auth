import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import GithubSlugger from 'github-slugger';
import { locales } from '@joeblew999/remy-ui/runtime';
import { m } from '@joeblew999/remy-ui/messages';
import { checkedLocales, collectErrors, hydrated, localizedPath } from '@joeblew999/remy-ui/checks';
import { branch, docsFile, docsI18nDir, docsLangs, docsLocale, docsObjectForKey, docsObjectKey, docsPath, docsRowForObjectKey, docsTable, docsTranslationFile, docsTranslationOf, repository } from '../src/docs/table.js';
import { askMaxLength } from '../src/ask-limits';
import { askPath, docsPaths, docsSearchPath } from '../src/paths';

// The docs site and its answers (.plans/docs-site.md, "Checks"). The source of truth for what a page
// must contain is the repository file itself, read here independently of Fumadocs: its headings with
// GitHub's ids, its tables and its code blocks. Answers depend on the live AI Search index, so the
// answer itself is checked only against a deployed target (project:test:remote); every check that
// runs locally is deterministic and never reaches AI Search (limits are checked before any call).

const remote = process.env.TEST_TARGET === 'remote';

/** The languages with translations on disk (docs/i18n/<locale>/), and a page's file and languages by table.js's rules. */
const translatedLocales = readdirSync(docsI18nDir);
const fileIn = (row: { file: string }, locale: string) => docsFile(row, locale, existsSync);
const langsOf = (row: { file: string }) => docsLangs(row, translatedLocales, existsSync);
/** Every language the docs have text in, English first. */
const docsLocales = [docsLocale, ...translatedLocales];

/** What a Markdown file holds, outside code fences: headings (level, GitHub id, text), tables, code blocks. */
function outline(file: string) {
  const slugger = new GithubSlugger();
  const headings: { level: number; id: string; text: string }[] = [];
  let tables = 0, code = 0, fence: string | undefined;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const opens = line.match(/^\s*(```+|~~~+)/);
    if (opens) {
      if (!fence) { fence = opens[1]; code++; } else if (line.trim().startsWith(fence)) fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      // GitHub slugs the rendered text: link text without the target, no backticks or emphasis marks.
      // A translation's explicit id (Fumadocs' `[#id]`, the English heading's) is the id, and is not text.
      const id = heading[2].match(/\s*\[#([^\]]+)\]$/);
      const text = heading[2].replace(/\s*\[#[^\]]+\]$/, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '');
      headings.push({ level: heading[1].length, id: id ? id[1] : slugger.slug(text), text });
    }
    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line) && line.includes('|')) tables++;
  }
  return { headings, tables, code };
}

const docsUrl = (slug: string, locale: string) => localizedPath(docsPath(slug), locale);

test.describe('docs pages', () => {
  for (const row of docsTable) {
    const { file, slug } = row;
    const langs = langsOf(row);
    test(`${docsPath(slug)} (${file}) is complete without JavaScript in every language: its translation self-canonical with alternates, else English canonical to /${docsLocale}`, async ({ browser, request, baseURL }) => {
      // The server's HTML itself: every heading's id is there before any script runs, in every language
      // the page has text in; translations keep the English ids.
      for (const lang of langs) {
        const html = await (await request.get(docsUrl(slug, lang))).text();
        for (const heading of outline(fileIn(row, lang)).headings) expect(html, `${fileIn(row, lang)}: ${heading.text}`).toContain(` id="${heading.id}"`);
        expect(outline(fileIn(row, lang)).headings.map(heading => heading.id), fileIn(row, lang)).toEqual(outline(file).headings.map(heading => heading.id));
      }
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      for (const locale of checkedLocales) {
        const url = docsUrl(slug, locale);
        const lang = langs.includes(locale) ? locale : docsLocale;
        const source = outline(fileIn(row, lang));
        const canonical = `${baseURL}${docsUrl(slug, lang)}`;
        expect((await page.goto(url))?.status(), url).toBe(200);
        await expect(page.locator('html'), url).toHaveAttribute('lang', locale);
        const article = page.locator(`article[data-docs-article="${slug}"]`);
        await expect(article, url).toHaveAttribute('lang', lang);
        await expect(page.getByRole('heading', { level: 1 }), url).toHaveText(source.headings[0].text);
        for (const heading of source.headings) await expect(article.locator(`h${heading.level}[id="${heading.id}"]`), `${url}: ${heading.text}`).toHaveCount(1);
        await expect(article.locator('table'), url).toHaveCount(source.tables);
        await expect(article.locator('pre'), url).toHaveCount(source.code);
        // The docs navigation lists every page; "On this page" every "##" heading.
        const nav = page.getByRole('navigation', { name: m.docs_nav({}, { locale }) });
        await expect(nav.getByRole('link'), url).toHaveCount(docsTable.length);
        await expect(nav.locator('[aria-current="page"]'), url).toHaveAttribute('href', url);
        const h2 = source.headings.filter(heading => heading.level === 2);
        if (h2.length) {
          const toc = page.getByRole('navigation', { name: m.docs_toc({}, { locale }) });
          await expect(toc.getByRole('link'), url).toHaveCount(h2.length);
          for (const heading of h2) await expect(toc.locator(`a[href="#${heading.id}"]`), url).toHaveCount(1);
        }
        // A language with its own text: canonical to itself, with every language the page has as
        // alternates and English as x-default. Any other language: English's canonical, no alternates.
        await expect(page.locator('link[rel="canonical"]'), url).toHaveAttribute('href', canonical);
        const alternates = lang === locale && langs.length > 1 ? [...langs.map(value => [value, value]), ['x-default', docsLocale]] : [];
        await expect(page.locator('link[hreflang]'), url).toHaveCount(alternates.length);
        for (const [hreflang, value] of alternates) await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`), url).toHaveAttribute('href', `${baseURL}${docsUrl(slug, value)}`);
        await expect(page.locator('meta[name="description"]'), url).toHaveAttribute('content', /\S{3}/);
        await expect(page.locator('meta[name="robots"]'), url).toHaveCount(0);
        // The site header links to the docs.
        await expect(page.locator('header').getByRole('link', { name: m.nav_docs({}, { locale }), exact: true }), url).toHaveAttribute('href', localizedPath('/docs', locale));
      }
      await context.close();
    });
  }

  test('the server\'s text stays on screen while the page hydrates, with no errors, and docs links navigate in the app', async ({ page }) => {
    const errors = collectErrors(page);
    // The article's text length at every change of the document, from the first parse on: it must never drop.
    await page.addInitScript(() => {
      const lengths: number[] = ((window as unknown as { __lengths: number[] }).__lengths = []);
      new MutationObserver(() => {
        const length = document.querySelector('article')?.textContent?.length ?? -1;
        if (length >= 0 && lengths.at(-1) !== length) lengths.push(length);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });
    for (const { slug } of docsTable) {
      const url = docsUrl(slug, 'en');
      await page.goto(url);
      await hydrated(page.locator('article a').first());
      const lengths = await page.evaluate(() => (window as unknown as { __lengths: number[] }).__lengths);
      expect(lengths.length, `${url}: ${lengths.join(' → ')}`).toBeGreaterThan(0);
      expect(Math.min(...lengths), `${url}: ${lengths.join(' → ')}`).toBe(lengths[0]);
    }
    // A link between docs pages is a client-side navigation, localized by the router.
    await page.goto(docsUrl('how-we-work', 'es'));
    await hydrated(page.locator('article a[href="/es/docs/development"]').first());
    let documents = 0;
    page.on('request', request => { if (request.resourceType() === 'document') documents++; });
    await page.locator('article a[href="/es/docs/development"]').first().click();
    await expect(page).toHaveURL(/\/es\/docs\/development$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(outline(fileIn({ file: 'docs/development.md' }, 'es')).headings[0].text);
    expect(documents).toBe(0);
    expect(errors).toEqual([]);
  });

  test('every link inside the docs resolves: docs links to an existing heading, GitHub links to a file in the repository', async ({ request, browser }) => {
    const ids = new Map<string, Set<string>>();
    const idsOf = async (path: string) => {
      if (!ids.has(path)) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        ids.set(path, new Set([...(await response.text()).matchAll(/ id="([^"]+)"/g)].map(match => match[1])));
      }
      return ids.get(path)!;
    };
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const prefix = `${repository}/`;
    // In every language the docs have text in: a translation's links resolve as its English file's do.
    for (const locale of docsLocales) for (const { slug } of docsTable) {
      const url = docsUrl(slug, locale);
      await page.goto(url);
      const hrefs = await page.locator(`article[data-docs-article="${slug}"] a[href]`).evaluateAll(links => links.map(link => link.getAttribute('href')!));
      for (const href of hrefs) {
        if (href.startsWith('#')) expect(await idsOf(url), `${url} → ${href}`).toContain(decodeURIComponent(href.slice(1)));
        else if (href.startsWith('/')) {
          expect(href, `${url} → ${href}`).toMatch(new RegExp(`^/${locale}/docs(/|#|$)`));
          const [path, hash] = href.split('#');
          const targets = await idsOf(path);
          if (hash) expect(targets, `${url} → ${href}`).toContain(decodeURIComponent(hash));
        } else if (href.startsWith(prefix)) {
          const target = href.slice(prefix.length).match(new RegExp(`^(?:blob|tree)/${branch}/([^#]+)`))?.[1];
          if (target) expect(existsSync(decodeURIComponent(target)), `${url} → ${href}`).toBe(true);
        } else expect(href, `${url}: an unexpected link`).toMatch(/^(https?:|mailto:)/);
      }
    }
    await context.close();
  });

  test('the sitemap lists every docs page once in each language it has text in (English, its translations), and no other language\'s docs URL', async ({ request, baseURL }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(docsPaths).toEqual(docsTable.map(row => docsPath(row.slug)));
    for (const row of docsTable) {
      const path = docsPath(row.slug);
      const langs = langsOf(row);
      for (const lang of langs) expect(xml.split(`<loc>${baseURL}/${lang}${path}</loc>`).length - 1, `${lang}${path}`).toBe(1);
      for (const locale of locales.filter(value => !langs.includes(value))) expect(xml, `${locale}${path}`).not.toContain(`${baseURL}/${locale}${path}<`);
    }
  });

  test('no duplicated content: the docs are read in place, and no two docs pages share a paragraph', async ({ browser }) => {
    // No copies: every docs file is a tracked repository file, Fumadocs' output (.source) is ignored,
    // no content folder exists, and no two tracked Markdown files are the same text.
    const tracked = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' }).trim().split('\n');
    for (const { file } of docsTable) expect(tracked, file).toContain(file);
    expect(execFileSync('git', ['check-ignore', '.source/server.ts'], { encoding: 'utf8' }).trim()).toBe('.source/server.ts');
    expect(existsSync('content'), 'a content/ folder of copies').toBe(false);
    const texts = new Map<string, string>();
    for (const file of tracked) {
      const text = readFileSync(file, 'utf8').trim();
      expect(texts.get(text), `${file} duplicates ${texts.get(text)}`).toBeUndefined();
      texts.set(text, file);
    }
    expect(readdirSync('.').filter(name => /^(content|docs-copy)$/.test(name))).toEqual([]);
    // No shared paragraphs between pages: each fact has one home, which the others link to.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const seen = new Map<string, string>();
    for (const { slug } of docsTable) {
      await page.goto(docsUrl(slug, docsLocale));
      const name = slug || 'the docs home';
      const article = `article[data-docs-article="${slug}"]`;
      const paragraphs = await page.locator(`${article} p, ${article} li:not(:has(p))`).allTextContents();
      for (const paragraph of new Set(paragraphs.map(text => text.replace(/\s+/g, ' ').trim()).filter(text => text.length >= 80))) {
        expect(seen.get(paragraph), `"${paragraph.slice(0, 60)}…" on ${name} is also on ${seen.get(paragraph)}`).toBeUndefined();
        seen.set(paragraph, name);
      }
    }
    await context.close();
  });

  test('every file docs:publish puts in the bucket maps back to its docs page, which exists', async ({ request }) => {
    const keys = docsTable.map(row => docsObjectKey(row.slug));
    expect(new Set(keys).size, 'keys are unique').toBe(keys.length);
    for (const row of docsTable) {
      const key = docsObjectKey(row.slug);
      expect(docsRowForObjectKey(key), key).toBe(row);
      expect(statSync(row.file).size, row.file).toBeLessThan(4 * 1024 * 1024);
      const path = `/${docsLocale}${docsPath(row.slug)}`;
      expect((await request.get(path)).status(), `${key} → ${path}`).toBe(200);
    }
  });

  test('translations: English at the bucket\'s root, each translation under its locale, every key round-trips to its page in that language', async ({ request }) => {
    expect(docsObjectKey('tooling', 'es')).toBe('es/tooling.md');
    expect(docsObjectKey('', 'es')).toBe('es/index.md');
    expect(docsObjectKey('tooling', docsLocale)).toBe('tooling.md');
    expect(docsObjectForKey('es/missing.md')).toBeUndefined();
    expect(translatedLocales, 'Spanish is translated').toContain('es');
    // Spanish: every page is translated (docs/i18n/es/).
    for (const row of docsTable) expect(existsSync(docsTranslationFile(row.file, 'es')), row.file).toBe(true);
    const keys: string[] = [];
    for (const locale of docsLocales) for (const row of docsTable) {
      const file = fileIn(row, locale);
      // A locale without its translation of a page publishes nothing for it: English answers.
      if (locale !== docsLocale && file === row.file) continue;
      if (locale !== docsLocale) expect(docsTranslationOf(file), file).toEqual({ locale, row });
      const key = docsObjectKey(row.slug, locale);
      keys.push(key);
      expect(docsObjectForKey(key), key).toEqual({ row, locale });
      expect(statSync(file).size, file).toBeLessThan(4 * 1024 * 1024);
      // The citation's page: /<locale>/docs/<slug>, its text in that language.
      const path = docsUrl(row.slug, locale);
      const response = await request.get(path);
      expect(response.status(), `${key} → ${path}`).toBe(200);
      expect(await response.text(), `${key} → ${path}`).toMatch(new RegExp(`<article lang="${locale}"`));
    }
    expect(new Set(keys).size, 'keys are unique').toBe(keys.length);
  });
});

/** The GitHub id of the heading a phrase first appears under, outside code blocks, in a Markdown file. */
function sectionOf(file: string, phrase: string) {
  const slugger = new GithubSlugger();
  let id: string | undefined, fence: string | undefined;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const opens = line.match(/^\s*(```+|~~~+)/);
    if (opens) { if (!fence) fence = opens[1]; else if (line.trim().startsWith(fence)) fence = undefined; continue; }
    if (fence) continue;
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) id = heading[1].match(/\s*\[#([^\]]+)\]$/)?.[1] ?? slugger.slug(heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, ''));
    else if (line.includes(phrase)) return id;
  }
  throw new Error(`${phrase} is not in ${file} outside code blocks`);
}

test.describe('docs search', () => {
  // A phrase only one section's prose has: the search must lead to that section's heading.
  const query = 'Workers Logs';
  const section = sectionOf('docs/tooling.md', query);

  test(`"${query}" leads from a docs page to its section in docs/tooling.md, without JavaScript, in every language; result pages are noindex`, async ({ browser, request }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const locale of checkedLocales) {
      const searchUrl = localizedPath(docsSearchPath, locale);
      await page.goto(docsUrl('how-we-work', locale));
      const form = page.locator('form[data-docs-search]');
      await expect(form).toHaveAttribute('method', 'get');
      await expect(form).toHaveAttribute('action', searchUrl);
      await form.getByLabel(m.search_label({}, { locale }), { exact: true }).fill(query);
      await form.getByRole('button', { name: m.search_submit({}, { locale }), exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${searchUrl}\\?q=Workers\\+Logs$`));
      await expect(page.locator('#docs-search-q')).toHaveValue(query);
      // Not for Google: noindex, and no canonical or alternates pointing elsewhere.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.locator('link[rel="canonical"], link[hreflang]')).toHaveCount(0);
      const target = `${docsUrl('tooling', locale)}#${section}`;
      // The section's text, the query's words marked.
      const hit = page.locator(`[data-docs-results] a[href="${target}"]`).filter({ has: page.locator('mark') }).first();
      await expect(hit, target).toBeVisible();
      await hit.click();
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      await expect(page.locator(`article [id="${section}"]`)).toHaveCount(1);
    }
    await context.close();
    // The server's own HTML says so too, before any script.
    expect(await (await request.get(`${localizedPath(docsSearchPath, 'en')}?q=${encodeURIComponent(query)}`)).text()).toMatch(/<meta name="robots" content="noindex"/);
  });

  test('a translated language searches its own text: a Spanish phrase leads to its Spanish section; English and an untranslated language search English', async ({ browser }) => {
    const spanish = 'memoria privada';
    const file = fileIn({ file: 'docs/how-we-work.md' }, 'es');
    expect(file).toBe(docsTranslationFile('docs/how-we-work.md', 'es'));
    const target = `${docsUrl('how-we-work', 'es')}#${sectionOf(file, spanish)}`;
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${localizedPath(docsSearchPath, 'es')}?q=${encodeURIComponent(spanish)}`);
    const hit = page.locator(`[data-docs-results] a[href="${target}"]`).filter({ has: page.locator('mark') }).first();
    await expect(hit, target).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    await expect(page.locator('article[lang="es"]')).toContainText(spanish);
    // English and Arabic (no translation) search the English docs, which do not have the phrase.
    for (const locale of ['en', 'ar']) {
      await page.goto(`${localizedPath(docsSearchPath, locale)}?q=${encodeURIComponent(spanish)}`);
      await expect(page.locator('[data-docs-results] a[href*="#where-rules-live"]'), locale).toHaveCount(0);
    }
    // And the English phrase of an untranslated locale leads to the English section there.
    await page.goto(`${localizedPath(docsSearchPath, 'ar')}?q=${encodeURIComponent('private memory')}`);
    await expect(page.locator(`[data-docs-results] a[href="${docsUrl('how-we-work', 'ar')}#${sectionOf('docs/how-we-work.md', 'private memory')}"]`).first()).toBeVisible();
    await context.close();
  });

  test('the empty search page shows the box and is indexable; a query that finds nothing says so', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const locale of checkedLocales) {
      for (const url of [localizedPath(docsSearchPath, locale), `${localizedPath(docsSearchPath, locale)}?q=`]) {
        expect((await page.goto(url))?.status(), url).toBe(200);
        await expect(page.getByRole('heading', { level: 1 }), url).toHaveText(m.search_title({}, { locale }));
        await expect(page.getByLabel(m.search_label({}, { locale }), { exact: true }), url).toHaveValue('');
        await expect(page.locator('[data-docs-results]'), url).toHaveCount(0);
        await expect(page.locator('meta[name="robots"]'), url).toHaveCount(0);
        await expect(page.locator('link[rel="canonical"]'), url).toHaveAttribute('href', `${baseURL}${localizedPath(docsSearchPath, locale)}`);
      }
      const url = `${localizedPath(docsSearchPath, locale)}?q=qqqzzzxxyy`;
      await page.goto(url);
      await expect(page.locator('[data-docs-results="none"]'), url).toContainText(m.search_none({}, { locale }));
      await expect(page.locator('meta[name="robots"]'), url).toHaveAttribute('content', 'noindex');
      // The way on: every docs page.
      await expect(page.getByRole('navigation', { name: m.docs_nav({}, { locale }) }).getByRole('link'), url).toHaveCount(docsTable.length);
    }
    await context.close();
  });

  test('with JavaScript, results are links in the app and the page has no errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${localizedPath(docsSearchPath, 'en')}?q=${encodeURIComponent(query)}`);
    const target = `${docsUrl('tooling', 'en')}#${section}`;
    await hydrated(page.locator(`[data-docs-results] a[href="${target}"]`).first());
    let documents = 0;
    page.on('request', request => { if (request.resourceType() === 'document') documents++; });
    await page.locator(`[data-docs-results] a[href="${target}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    await expect(page.locator(`article [id="${section}"]`)).toHaveCount(1);
    expect(documents).toBe(0);
    expect(errors).toEqual([]);
  });
});

// The live search panel (.plans/docs-site.md, "Live search panel"): shadcn's Command in its dialog, from
// the header's Search link or ⌘K / Ctrl+K. Without JavaScript that link is the way to /docs/search.
test.describe('live search panel', () => {
  const query = 'Workers Logs';
  const section = sectionOf('docs/tooling.md', query);
  const searchLink = (page: Page, locale: string) =>
    page.locator('header').getByRole('link', { name: m.search_submit({}, { locale }), exact: true });

  test('without JavaScript, the header\'s Search link leads to the search page in every language', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const locale of checkedLocales) {
      await page.goto(docsUrl('how-we-work', locale));
      await searchLink(page, locale).click();
      await expect(page).toHaveURL(new RegExp(`${localizedPath(docsSearchPath, locale)}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.search_title({}, { locale }));
    }
    await context.close();
  });

  test('opens from the header and with ⌘K / Ctrl+K; results come as the visitor types, each a link in the app to its heading; choosing one goes there; Escape closes', async ({ page }) => {
    const errors = collectErrors(page);
    const start = docsUrl('how-we-work', 'en');
    await page.goto(start);
    await hydrated(searchLink(page, 'en'));
    const dialog = page.getByRole('dialog');
    // The link opens the panel in place of the search page.
    await searchLink(page, 'en').click();
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${start}$`));
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // The shortcut, with either modifier.
    for (const shortcut of ['Control+k', 'Meta+k']) {
      await page.keyboard.press(shortcut);
      await expect(dialog, shortcut).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog, shortcut).toBeHidden();
    }
    await page.keyboard.press('ControlOrMeta+k');
    await dialog.getByRole('combobox').pressSequentially(query);
    const target = `${docsUrl('tooling', 'en')}#${section}`;
    const hit = dialog.locator(`[data-docs-results] a[href="${target}"]`).filter({ has: page.locator('mark') }).first();
    await expect(hit, target).toBeVisible();
    let documents = 0;
    page.on('request', request => { if (request.resourceType() === 'document') documents++; });
    await hit.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    await expect(dialog).toBeHidden();
    await expect(page.locator(`article [id="${section}"]`)).toHaveCount(1);
    // Enter follows the selected result's link.
    await page.keyboard.press('ControlOrMeta+k');
    await dialog.getByRole('combobox').fill(query);
    const selected = dialog.locator('[cmdk-item][data-selected="true"] a');
    await expect(selected).toHaveAttribute('href', /\/en\/docs/);
    const href = await selected.getAttribute('href');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    await expect(dialog).toBeHidden();
    expect(documents).toBe(0);
    expect(errors).toEqual([]);
  });

  test('"Ask AI" asks only when chosen, never while typing, and shows the local "no answer" with a link to the answer page', async ({ browser }) => {
    test.skip(remote, 'Locally the binding is switched off, so the answer is "no answer" and no model is called; a deployed target would pay for one.');
    const context = await browser.newContext({ extraHTTPHeaders: visitor() });
    const page = await context.newPage();
    const errors = collectErrors(page);
    // askDocs sends the question with the page's language; searchDocs only the query.
    const asks: string[] = [];
    page.on('request', request => { if (request.url().includes('/_serverFn/') && decodeURIComponent(request.url()).includes('"locale"')) asks.push(request.url()); });
    const question = 'Where do the docs live?';
    await page.goto(docsUrl('how-we-work', 'ar'));
    await hydrated(searchLink(page, 'ar'));
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').pressSequentially(question);
    const ask = dialog.locator('[data-ask-ai]');
    await expect(ask).toHaveText(m.search_panel_ask({ query: question }, { locale: 'ar' }));
    await expect(dialog.locator('[data-docs-results]').first()).toBeVisible();
    expect(asks, 'questions asked while typing').toEqual([]);
    await ask.click();
    await expect(dialog.locator('[data-ask="no-answer"]')).toHaveText(m.ask_no_answer({}, { locale: 'ar' }));
    expect(asks).toHaveLength(1);
    await expect(dialog.locator('[data-ask-page]')).toHaveAttribute('href', `${localizedPath(askPath, 'ar')}?q=${encodeURIComponent(question).replace(/%20/g, '+')}`);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
    await context.close();
  });
});

/**
 * The rate limit is keyed by the visitor's address (CF-Connecting-IP). Locally each check is its own
 * visitor, an address from the documentation range, so no check (or earlier run: Wrangler keeps the
 * counts) spends another's budget. A deployed target ignores the header: Cloudflare sets it.
 */
const visitor = () => (remote ? {} : { 'CF-Connecting-IP': `2001:db8::${crypto.randomUUID().slice(0, 4)}:${crypto.randomUUID().slice(0, 4)}` });

test.describe('answers', () => {
  // One after another: on a deployed target every question comes from this machine's one address,
  // so the answer comes before the check that runs the limit out.
  test.describe.configure({ mode: 'serial' });

  test('the answer page is a site page beside the search: indexable when empty, noindex with a question, never stored, a plain form that works without JavaScript', async ({ browser, request, baseURL }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    // An over-long question: a question page that costs nothing (limits come before any call).
    const question = 'z'.repeat(askMaxLength + 1);
    for (const locale of checkedLocales) {
      const url = localizedPath(askPath, locale);
      const empty = await request.get(url);
      expect(empty.status(), url).toBe(200);
      expect(empty.headers()['cache-control'], url).toBe('private, no-store');
      const html = await empty.text();
      expect(html, url).not.toMatch(/<meta name="robots"/);
      expect(html, url).toContain(`<link rel="canonical" href="${baseURL}${url}"`);
      // Like the search page: not in the sitemap.
      expect(sitemap, url).not.toContain(`${url}<`);
      const asked = await request.get(`${url}?q=${question}`, { headers: visitor() });
      expect(asked.status(), url).toBe(200);
      expect(asked.headers()['cache-control'], url).toBe('private, no-store');
      const answer = await asked.text();
      expect(answer, url).toMatch(/<meta name="robots" content="noindex"/);
      expect(answer, url).not.toMatch(/<link rel="(canonical|alternate)"/);
    }
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const locale of checkedLocales) {
      // The form on a docs page and on the answer page: GET to the localized answer page, the question as q.
      for (const path of [docsUrl('how-we-work', locale), localizedPath(askPath, locale)]) {
        await page.goto(path);
        const form = page.locator('form[role="search"]');
        await expect(form, path).toHaveAttribute('method', 'get');
        await expect(form, path).toHaveAttribute('action', localizedPath(askPath, locale));
        const input = form.getByLabel(m.ask_label({}, { locale }), { exact: true });
        await expect(input, path).toHaveAttribute('name', 'q');
        await expect(input, path).toHaveAttribute('maxlength', String(askMaxLength));
      }
      await expect(page.locator('[data-ask]')).toHaveCount(0);
      // The site's frame: the answer page is a site page with its docs navigation.
      await expect(page.locator('[data-zone="site"]')).toHaveText(m.zone_site({}, { locale }));
      await expect(page.getByRole('navigation', { name: m.docs_nav({}, { locale }) }).getByRole('link')).toHaveCount(docsTable.length);
    }
    await context.close();
  });

  test('the old app page /app/ask redirects permanently to the answer page in every language, keeping the question', async ({ request }) => {
    for (const locale of checkedLocales) {
      for (const query of ['', '?q=docs']) {
        const url = `${localizedPath('/app/ask', locale)}${query}`;
        const response = await request.get(url, { maxRedirects: 0 });
        expect(response.status(), url).toBe(301);
        expect(response.headers()['location'], url).toMatch(new RegExp(`${localizedPath(askPath, locale)}${query.replace('?', '\\?')}$`));
      }
    }
  });

  test(`a question over ${askMaxLength} characters is explained, not sent`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: visitor() });
    const page = await context.newPage();
    const question = 'x'.repeat(askMaxLength + 1);
    await page.goto(`${localizedPath(askPath, 'en')}?q=${question}`);
    await expect(page.locator('[data-ask="too-long"]')).toHaveText(m.ask_too_long({ length: askMaxLength + 1, max: askMaxLength }, { locale: 'en' }));
    // The box keeps what fits, so the visitor can shorten it.
    await expect(page.locator('#ask-q')).toHaveValue(question.slice(0, askMaxLength));
    await context.close();
  });

  test('with AI Search out of reach, a question gets "no answer" and the way to the docs, never a blank page', async ({ browser }) => {
    test.skip(remote, 'Locally the binding is switched off (wrangler dev --local, playwright.config.ts); a deployed target answers.');
    const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: visitor() });
    const page = await context.newPage();
    await page.goto(`${localizedPath(askPath, 'ar')}?q=${encodeURIComponent('Where do the docs live?')}`);
    await expect(page.locator('[data-ask="no-answer"]')).toHaveText(m.ask_no_answer({}, { locale: 'ar' }));
    const nav = page.getByRole('navigation', { name: m.docs_nav({}, { locale: 'ar' }) });
    await expect(nav.getByRole('link')).toHaveCount(docsTable.length);
    await expect(nav.getByRole('link').first()).toHaveAttribute('href', localizedPath('/docs', 'ar'));
    await context.close();
  });

  test('going back to an answer from a docs page shows it again without asking again', async ({ browser }) => {
    test.skip(remote, 'Locally, where the answer is "no answer" and its docs links are on the page.');
    const context = await browser.newContext({ extraHTTPHeaders: visitor() });
    const page = await context.newPage();
    await page.goto(`${localizedPath(askPath, 'en')}?q=${encodeURIComponent('Where do the docs live?')}`);
    await hydrated(page.locator('body'));
    await page.getByRole('navigation', { name: m.docs_nav({}, { locale: 'en' }) }).getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`${localizedPath('/docs', 'en')}$`));
    const calls = [];
    page.on('request', request => { if (request.url().includes('/_serverFn/')) calls.push(request.url()); });
    await page.goBack();
    await expect(page.locator('[data-ask="no-answer"]')).toBeVisible();
    expect(calls, 'server functions called on the way back').toEqual([]);
    await context.close();
  });

  test('a fixed question gets an answer whose every citation opens an existing docs page, or a heading on it', async ({ page, request }) => {
    test.skip(!remote, 'Answers come from the live AI Search index: checked against a deployed target (project:test:remote).');
    const question = 'What must I run before pushing or releasing, and why not pipe it through grep?';
    await page.goto(`${localizedPath(askPath, 'es')}?q=${encodeURIComponent(question)}`);
    await expect(page.locator('[data-ask="answered"]')).toBeVisible();
    const citations = await page.locator('a[data-citation]').evaluateAll(links => links.map(link => ({ href: link.getAttribute('href')!, title: link.textContent! })));
    expect(citations.length).toBeGreaterThan(0);
    expect(new Set(citations.map(citation => citation.href)).size, 'each cited once').toBe(citations.length);
    const titles: { href: string; path: string; id?: string; title: string }[] = [];
    for (const { href, title } of citations) {
      // Citations open the docs in the visitor's frame language: a docs page, or a section of it.
      expect(href).toMatch(/^\/es\/docs(\/[^#/]+)?(#.+)?$/);
      const [path, id] = href.split('#');
      const response = await request.get(path);
      expect(response.status(), href).toBe(200);
      if (id) expect(await response.text(), href).toMatch(new RegExp(`<h[1-6][^>]* id="${id}"`));
      // The title is the page's own, then the section's heading when the citation names one.
      titles.push({ href, path, id, title });
    }
    for (const { href, path, id, title } of titles) {
      await page.goto(path);
      const pageTitle = (await page.getByRole('heading', { level: 1 }).textContent())!.trim();
      expect(title, href).toBe(id ? `${pageTitle}: ${(await page.locator(`article [id="${id}"]`).textContent())!.trim()}` : pageTitle);
    }
  });

  test('every question counts against a rate limit of 10 a minute from one address', async ({ request }) => {
    // Over-long questions count too and cost nothing, so the limit is checked without asking AI Search.
    const question = 'y'.repeat(askMaxLength + 1);
    const outcomes: string[] = [];
    // Windows are fixed minutes on the wall clock, so a burst may straddle two: 21 questions in a few
    // seconds must reach the limit whatever the timing, since no window lets more than 10 through.
    // Cloudflare counts per location and settles within moments, so a deployed target may let a few
    // more through (developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit).
    const most = remote ? 25 : 21;
    const accepted = new Map<number, number>();
    const headers = visitor();
    for (let attempt = 0; attempt < most && outcomes.at(-1) !== 'rate-limited'; attempt++) {
      const minute = Math.floor(Date.now() / 60_000);
      const html = await (await request.get(`${localizedPath(askPath, 'en')}?q=${question}`, { headers })).text();
      const outcome = html.match(/data-ask="([^"]+)"/)?.[1] ?? 'none';
      outcomes.push(outcome);
      if (outcome !== 'rate-limited' && minute === Math.floor(Date.now() / 60_000)) accepted.set(minute, (accepted.get(minute) ?? 0) + 1);
    }
    expect(outcomes.at(-1), outcomes.join(', ')).toBe('rate-limited');
    expect(outcomes.slice(0, -1).every(outcome => outcome === 'too-long'), outcomes.join(', ')).toBe(true);
    // Locally the count is exact: no minute let more than 10 through.
    if (!remote) for (const [minute, count] of accepted) expect(count, `minute ${minute}`).toBeLessThanOrEqual(10);
  });
});
