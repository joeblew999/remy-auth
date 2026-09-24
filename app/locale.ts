import { isLocale, type Locale } from '@joeblew999/remy-ui/locale';

export const cookieName = 'locale';

export function requireLocale(value: string | undefined): Locale {
  if (!isLocale(value)) throw new Response('Not found', { status: 404 });
  return value;
}

/** The best available locale for an Accept-Language header, if any matches. */
export function matchLocale(header: string | null): Locale | undefined {
  const ranked = (header ?? '').split(',').map(part => {
    const [tag, ...params] = part.trim().split(';');
    const quality = params.map(param => param.trim()).find(param => param.startsWith('q='))?.slice(2);
    return { tag: tag.trim().toLowerCase(), quality: quality === undefined ? 1 : Number(quality) };
  }).filter(entry => entry.tag && entry.quality > 0).sort((a, b) => b.quality - a.quality);
  for (const { tag } of ranked) {
    if (isLocale(tag)) return tag;
    const language = tag.split('-')[0];
    if (isLocale(language)) return language;
  }
  return undefined;
}

/** The language the visitor explicitly chose earlier on this device, if the cookie names a known locale. */
export function chosenLocale(cookieHeader: string | null): Locale | undefined {
  const value = (cookieHeader ?? '').split(';').map(pair => pair.trim())
    .find(pair => pair.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return isLocale(value) ? value : undefined;
}
