import { redirect } from 'react-router';
import { buttonVariants } from '@joeblew999/remy-ui/button';
import { locales, localeName, direction, baseLocale, type Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { chosenLocale, matchLocale } from './locale';
import { rememberLocale } from './preference';

/**
 * Language chooser for URLs without a locale, following Google's guidance: no automatic
 * redirect between language versions, links to every version, and the best match suggested.
 * A choice the visitor made earlier on this device is honoured.
 */
export function chooserData(request: Request, path: string) {
  const chosen = chosenLocale(request.headers.get('cookie'));
  if (chosen) throw redirect(`/${chosen}${path}`, { status: 302, headers: { Vary: 'Cookie' } });
  const suggested = matchLocale(request.headers.get('accept-language'));
  return { path, suggested, locale: suggested ?? baseLocale, origin: new URL(request.url).origin };
}

export function chooserMeta(data: ReturnType<typeof chooserData> | undefined) {
  if (!data) return [];
  const { locale, origin, path } = data;
  const self = `${origin}${path || '/'}`;
  return [
    { title: `${m.choose_title({}, { locale })} | Remy` },
    { name: 'description', content: m.choose_description({}, { locale }) },
    { tagName: 'link', rel: 'canonical', href: self },
    ...locales.map(value => ({ tagName: 'link', rel: 'alternate', hrefLang: value, href: `${origin}/${value}${path}` })),
    { tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: self },
  ];
}

export function Chooser({ path, suggested, locale }: { path: string; suggested?: Locale; locale: Locale }) {
  const ordered = suggested ? [suggested, ...locales.filter(value => value !== suggested)] : [...locales];
  return <main id="main" className="chooser">
    <p className="eyebrow"><span className="status-dot" />Remy</p>
    <h1>{m.choose_title({}, { locale })}</h1>
    <p className="intro">{m.choose_description({}, { locale })}</p>
    <ul className="choices">
      {ordered.map(value => <li key={value} lang={value} dir={direction(value)}>
        <a className={buttonVariants({ size: 'lg', variant: value === suggested ? 'default' : 'outline' })}
          href={`/${value}${path}`} hrefLang={value} onClick={() => rememberLocale(value)}>
          {m.continue_in({ language: localeName(value) }, { locale: value })}
        </a>
        {value === suggested && <span className="suggested" lang={locale} dir={direction(locale)}>{m.suggested_label({}, { locale })}</span>}
      </li>)}
    </ul>
  </main>;
}
