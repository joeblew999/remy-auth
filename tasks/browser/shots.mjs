// Screenshots for looking at the site as a visitor does (mise browser:shots): each page at desktop and
// phone width, light and dark, in English and Arabic (left to right, right to left), into one folder.
// Automated checks prove behaviour; these show the look. Pages: the package's site and app pages plus
// any given on the command line. Origin: the argument --origin, else DEPLOY_ORIGIN (the live app).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(`${process.cwd()}/package.json`);
const playwright = await import(pathToFileURL(require.resolve('@playwright/test')).href);
const chromium = playwright.chromium ?? playwright.default.chromium;
const { sitePaths, appPaths } = await import(pathToFileURL(require.resolve('@joeblew999/remy-ui/paths')).href);
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const origin = flag('origin') ?? process.env.DEPLOY_ORIGIN;
const out = flag('out') ?? `${process.env.TMPDIR ?? '/tmp'}/remy-shots`;
if (!origin) throw new Error('browser:shots needs --origin or DEPLOY_ORIGIN');
const paths = [...new Set([...sitePaths, ...appPaths, ...args])];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let count = 0;
for (const [width, height, size] of [[1280, 900, 'desktop'], [390, 844, 'phone']]) for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
  for (const locale of ['en', 'ar']) for (const path of paths) {
    await page.goto(`${origin}/${locale}${path}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${out}/${locale}${path.replaceAll('/', '_') || '_home'}-${size}-${scheme}.png`, fullPage: size === 'phone' });
    count++;
  }
  await page.close();
}
await browser.close();
console.log(`${count} screenshots of ${origin} in ${out}`);
