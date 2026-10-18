// Screenshots for looking at a page as a visitor does (`remy shots`, pnpm remy shots): a debugging tool.
//   pnpm remy shots /docs/tooling                        one shot: desktop, light, English
//   pnpm remy shots /formats --phone --dark --locale ar  only the variants asked for
//   pnpm remy shots --all                                every site and app page, desktop and phone, light and dark, en and ar
//   pnpm remy shots /formats --video                     a WebM of the page loading and scrolled through
// Width: --desktop (1280) and/or --phone (390), default desktop. Theme: --light and/or --dark, default
// light. Language: --locale en,ar (default en). Origin: --origin, else the production origin; a local
// build works too. Prints each file's path, so it can be opened or read straight away.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { origins } from './config.ts';

export async function shots(args: string[]): Promise<void> {
  const require = createRequire(import.meta.url);
  const playwright = (await import(pathToFileURL(require.resolve('@playwright/test')).href)) as {
    chromium?: any;
    default?: { chromium: any };
  };
  const chromium = playwright.chromium ?? playwright.default!.chromium;
  const has = (name: string) => args.includes(`--${name}`);
  const value = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const valued = new Set(['origin', 'out', 'locale']);
  const paths = args.filter((arg, i) => !arg.startsWith('--') && !valued.has(args[i - 1]?.slice(2) ?? ''));
  const all = has('all');
  const origin = value('origin') ?? origins().production;
  const out = value('out') ?? `${process.env.TMPDIR ?? '/tmp'}/remy-shots`;
  if (!origin) throw new Error("shots needs --origin or VITE_DEPLOY_ORIGIN in the app's .env");
  let pages = paths;
  if (all) {
    const { sitePaths, appPaths } = (await import(
      pathToFileURL(require.resolve('@joeblew999/remy-ui/paths')).href
    )) as { sitePaths: string[]; appPaths: string[] };
    pages = [...new Set([...sitePaths, ...appPaths, ...paths])];
  }
  if (pages.length === 0) throw new Error('shots: name a page (e.g. /docs/tooling) or pass --all');
  const sizes: [string, number, number][] =
    all || (has('desktop') && has('phone'))
      ? [
          ['desktop', 1280, 900],
          ['phone', 390, 844],
        ]
      : has('phone')
        ? [['phone', 390, 844]]
        : [['desktop', 1280, 900]];
  const schemes: ('light' | 'dark')[] =
    all || (has('light') && has('dark')) ? ['light', 'dark'] : has('dark') ? ['dark'] : ['light'];
  const locales = all ? ['en', 'ar'] : (value('locale') ?? 'en').split(',');
  const url = (locale: string, path: string) =>
    `${origin}/${locale}${path === '' || path.startsWith('/') ? path : `/${path}`}`;
  const name = (locale: string, path: string) =>
    `${locale}${path.replaceAll('/', '_').replaceAll('?', '-') || '_home'}`;
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  if (has('video')) {
    // Playwright's own recording (recordVideo, its bundled ffmpeg): load the page, pause, scroll to the end in steps, pause.
    const [size, width, height] = sizes[0]!;
    for (const locale of locales)
      for (const path of pages) {
        const context = await browser.newContext({
          viewport: { width, height },
          colorScheme: schemes[0],
          recordVideo: { dir: out, size: { width, height } },
        });
        const page = await context.newPage();
        await page.goto(url(locale, path), { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);
        // These run in the page; the command line's own TypeScript has no DOM library, so the page's globals come through globalThis.
        const total: number = await page.evaluate(() => {
          const g = globalThis as any;
          return g.document.documentElement.scrollHeight - g.innerHeight;
        });
        for (let y = 0; y < total; y += Math.max(200, Math.round(total / 12))) {
          await page.evaluate((top: number) => (globalThis as any).scrollTo({ top, behavior: 'smooth' }), y);
          await page.waitForTimeout(500);
        }
        await page.waitForTimeout(1000);
        const video = page.video();
        await context.close();
        const file = `${out}/${name(locale, path)}-${size}-${schemes[0]}.webm`;
        await video.saveAs(file);
        await video.delete();
        console.log(file);
      }
    await browser.close();
    return;
  }
  for (const [size, width, height] of sizes)
    for (const scheme of schemes) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
      for (const locale of locales)
        for (const path of pages) {
          const file = `${out}/${name(locale, path)}-${size}-${scheme}.png`;
          await page.goto(url(locale, path), { waitUntil: 'networkidle' });
          await page.screenshot({ path: file, fullPage: size === 'phone' });
          console.log(file);
        }
      await page.close();
    }
  await browser.close();
}

export const what =
  '[path] [--phone] [--dark] [--locale en,ar] [--video] [--all] [--out dir] [--origin url]: screenshots (or a WebM) of a page as a visitor sees it; --all every page, desktop and phone, light and dark, en and ar (pnpm remy shots)';
export const main = (args: string[]): Promise<void> => shots(args);
