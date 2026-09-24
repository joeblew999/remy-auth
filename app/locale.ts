import { isLocale, type Locale } from '@remy/ui/locale';
export function requireLocale(value: string | undefined): Locale {
  if (!isLocale(value)) throw new Response('Not found', { status: 404 });
  return value;
}
