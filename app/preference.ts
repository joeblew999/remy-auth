import type { Locale } from '@remy/ui/locale';
import { cookieName } from './locale';

/** Remember an explicit language choice on this device. Browser only; the server reads the cookie. */
export function rememberLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${cookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
