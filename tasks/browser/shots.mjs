// Screenshots for looking at a page as a visitor does (mise browser:shots): a debugging tool.
//   mise run browser:shots -- /docs/tooling                      one shot: desktop, light, English
//   mise run browser:shots -- /formats --phone --dark --locale ar  only the variants asked for
//   mise run browser:shots -- --all                             every site and app page, desktop and
//                                                               phone, light and dark, en and ar
// Width: --desktop (1280) and/or --phone (390), default desktop. Theme: --light and/or --dark, default
// light. Language: --locale en,ar (default en). Origin: --origin, else DEPLOY_ORIGIN (the live app); a
// local build works too. Prints each file's path, so it can be opened or read straight away.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(`${process.cwd()}/package.json`);
const playwright = await import(pathToFileURL(require.resolve('@playwright/test')).href);
const chromium = playwright.chromium ?? playwright.default.chromium;

const args = process.argv.slice(2);
const has = name => args.includes(`--${name}`);
const value = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['origin', 'out', 'locale']);
const paths = args.filter((arg, i) => !arg.startsWith('--') && !valued.has(args[i - 1]?.slice(2)));
const all = has('all');
const origin = value('origin') ?? process.env.DEPLOY_ORIGIN;
const out = value('out') ?? `${process.env.TMPDIR ?? '/tmp'}/remy-shots`;
if (!origin) throw new Error('browser:shots needs --origin or DEPLOY_ORIGIN');

let pages = paths;
if (all) {
  const { sitePaths, appPaths } = await import(pathToFileURL(require.resolve('@joeblew999/remy-ui/paths')).href);
  pages = [...new Set([...sitePaths, ...appPaths, ...paths])];
}
if (pages.length === 0) throw new Error('browser:shots: name a page (e.g. /docs/tooling) or pass --all');
const sizes = all || (has('desktop') && has('phone')) ? [['desktop', 1280, 900], ['phone', 390, 844]]
  : has('phone') ? [['phone', 390, 844]] : [['desktop', 1280, 900]];
const schemes = all || (has('light') && has('dark')) ? ['light', 'dark'] : has('dark') ? ['dark'] : ['light'];
const locales = all ? ['en', 'ar'] : (value('locale') ?? 'en').split(',');

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [size, width, height] of sizes) for (const scheme of schemes) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
  for (const locale of locales) for (const path of pages) {
    const file = `${out}/${locale}${path.replaceAll('/', '_').replaceAll('?', '-') || '_home'}-${size}-${scheme}.png`;
    await page.goto(`${origin}/${locale}${path === '' || path.startsWith('/') ? path : `/${path}`}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: file, fullPage: size === 'phone' });
    console.log(file);
  }
  await page.close();
}
await browser.close();
