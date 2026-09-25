import geistLatin from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import notoSansArabic from '@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2?url';

// Preload links for the font files a page's first screen needs, so text renders in its real font
// without waiting for the stylesheet to discover them (web.dev: preload critical fonts). Vite gives
// these the same hashed URLs as the @font-face rules in fonts.css. Add a language here when its
// script gets its own font in fonts.css.
const scriptFonts: Record<string, string[]> = { ar: [notoSansArabic] };

/** `<link rel="preload">` entries for a route's `head().links`: Geist's Latin file, plus the page language's own script. */
export function fontPreloads(locale: string) {
  return [geistLatin, ...(scriptFonts[locale] ?? [])]
    .map(href => ({ rel: 'preload', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' as const, href }));
}
