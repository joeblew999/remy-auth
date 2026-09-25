import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { locales, getTextDirection as direction, type Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { localeName } from './locale';
import { weekdayName, type LocaleInfo } from './locale-info';
import { DeviceTime } from './client';
import { LanguageHint, LanguageSwitcher } from './language';
import { samples } from './samples.js';
import { Badge } from './components/badge';
import { Button, buttonVariants } from './components/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/card';
import { Separator } from './components/separator';

// The pages every Remy app built on this package shows, and that the shared checks test.
// Apps keep their route modules (loaders, head, runtime wiring) and render these.
// In-app links are TanStack Links to de-localized paths: the router's rewrite (localeRewrite in
// ./tanstack) adds the page's locale, and they preload on intent. Language changes stay full
// navigations through the plain anchors of LanguageSwitcher and LanguageHint.

export { sitePaths, appPaths, allPaths, isAppPath } from './paths.js';

/** "Skip to content", the first thing in every frame, site or app. */
export function SkipLink({ locale }: { locale: Locale }) {
  return <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-60 focus:bg-background focus:p-3" href="#main">{m.skip_link({}, { locale })}</a>;
}

/** The label every page shows, so anyone can see which kind of page it is (paths.js explains the two). */
export function ZoneBadge({ locale, app }: { locale: Locale; app: boolean }) {
  return <Badge variant={app ? 'default' : 'outline'} data-zone={app ? 'app' : 'site'}>{app ? m.zone_app({}, { locale }) : m.zone_site({}, { locale })}</Badge>;
}

/**
 * The frame of a site page: static shadcn components only (links styled as buttons, Badge,
 * Separator), so the page is complete without JavaScript. `preferred` is the language to offer.
 */
export function SiteShell({ locale, path = '', preferred, children }: { locale: Locale; path?: string; preferred?: Locale; children: React.ReactNode }) {
  const o = { locale };
  return <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 sm:px-8">
    <SkipLink locale={locale} />
    <LanguageHint locale={locale} path={path} preferred={preferred} />
    <header className="site-header flex items-center justify-between gap-3 pt-4">
      <Link className={buttonVariants({ variant: 'ghost', className: 'brand font-semibold' })} to="/" preload="intent">Remy</Link>
      <LanguageSwitcher locale={locale} path={path} />
    </header>
    <nav aria-label={m.nav_heading({}, o)} className="flex flex-wrap items-center gap-1 py-2">
      <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} to="/formats" preload="intent">{m.nav_formats({}, o)}</Link>
      <Link className={buttonVariants({ size: 'sm', className: 'ms-auto' })} to="/app" preload="intent">{m.open_app({}, o)}</Link>
    </nav>
    <Separator />
    <main id="main" className="flex-1 py-10"><div className="mb-6"><ZoneBadge locale={locale} app={false} /></div>{children}</main>
  </div>;
}

/** The frame of a site page, also for not-found and error pages. App pages use AppShell from ./app-pages. */
export const Shell = SiteShell;

export function Intro({ locale, label, title, intro, back = true, backTo = '/' }: { locale: Locale; label: string; title: string; intro: string; back?: boolean; backTo?: '/' | '/app' }) {
  return <>
    {back && <Link className="inline-flex items-center gap-1 text-sm text-muted-foreground" to={backTo} preload="intent"><ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />{m.home_link({}, { locale })}</Link>}
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
    <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{intro}</p>
  </>;
}

/** The home page; `children` go inside the page under its links, for example an app's live status. */
export function HomePage({ locale, preferred, children }: { locale: Locale; preferred?: Locale; children?: React.ReactNode }) {
  const o = { locale };
  return <Shell locale={locale} preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} back={false} label={m.public_label({}, o)} title={m.home_title({}, o)} intro={m.home_intro({}, o)} />
      <div className="flex flex-wrap gap-3">
        <Link className={buttonVariants({ size: 'lg' })} to="/app/demo" preload="intent">{m.demo_link({}, o)}</Link>
        <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} to="/formats" preload="intent">{m.formats_link({}, o)}</Link>
      </div>
      {children}
    </section>
  </Shell>;
}

/** A titled card of label/value rows on the formats page. */
export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent><dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">{children}</dl></CardContent></Card>;
}
/** One row; `sample` becomes data-sample, which the shared checks read. */
export function Row({ sample, label, children, ...rest }: { sample: string; label: string; children: React.ReactNode } & Record<string, unknown>) {
  return <><dt className="text-muted-foreground">{label}</dt><dd data-sample={sample} className="tabular-nums [overflow-wrap:anywhere]" {...rest}>{children}</dd></>;
}

/** Extra rows an app adds inside the shared groups, and extra sections before and after them. */
export type FormatsExtras = { language?: React.ReactNode; systems?: React.ReactNode; dates?: React.ReactNode; currency?: React.ReactNode; beforeSystems?: React.ReactNode; after?: React.ReactNode };

export function FormatsPage({ locale, info, preferred, extras = {} }: { locale: Locale; info: LocaleInfo; preferred?: Locale; extras?: FormatsExtras }) {
  const o = { locale };
  const dir = direction(locale);
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  return <Shell locale={locale} path="/formats" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} label={m.formats_label({}, o)} title={m.formats_title({}, o)} intro={m.formats_intro({}, o)} />
      <Group title={m.language_label({}, o)}>
        <Row sample="tag" label={m.language_tag({}, o)}><code>{locale}</code></Row>
        <Row sample="name" label={m.language_name({}, o)}>{localeName(locale)}</Row>
        <Row sample="direction" label={m.direction_label({}, o)} data-direction={dir}>{dir === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o)}</Row>
        <Row sample="languages" label={m.languages_available({}, o)}>{list.format(locales.map(value => localeName(value)))}</Row>
        {extras.language}
      </Group>
      {extras.beforeSystems}
      <Group title={m.systems_heading({}, o)}>
        <Row sample="calendar" label={m.calendar_label({}, o)}>{calendarName.of(info.calendar)}</Row>
        <Row sample="numbering" label={m.numbering_label({}, o)}><code>{info.numberingSystem}</code> · {new Intl.NumberFormat(locale, { numberingSystem: info.numberingSystem }).format(samples.decimal)}</Row>
        <Row sample="hour-cycle" label={m.hour_cycle_label({}, o)}>{['h11', 'h12'].includes(info.hourCycle) ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o)}</Row>
        {info.firstDay && <Row sample="week-start" label={m.week_start_label({}, o)}>{weekdayName(locale, info.firstDay)}</Row>}
        {extras.systems}
      </Group>
      <Group title={m.dates_heading({}, o)}>
        <Row sample="instant" label={m.instant_label({}, o)}><time dateTime={samples.instant.toISOString()}>{m.instant_value({ instant: samples.instant }, o)}</time></Row>
        <Row sample="date" label={m.plain_date_label({}, o)}><time dateTime={samples.date.toISOString().slice(0, 10)}>{m.plain_date_value({ date: samples.date }, o)}</time></Row>
        {extras.dates}
        <Row sample="relative" label={m.relative_label({}, o)}>{m.relative_value({ days: samples.days }, o)}</Row>
        <Row sample="local-row" label={m.local_time_label({}, o)}><DeviceTime locale={locale} instant={samples.instant} data-sample="local" /></Row>
      </Group>
      <Group title={m.numbers_heading({}, o)}>
        <Row sample="decimal" label={m.decimal_label({}, o)}>{m.decimal_value({ value: samples.decimal }, o)}</Row>
        <Row sample="percent" label={m.percent_label({}, o)}>{m.percent_value({ value: samples.share }, o)}</Row>
        <Row sample="compact" label={m.compact_label({}, o)}>{m.compact_value({ value: samples.big }, o)}</Row>
      </Group>
      <Group title={m.currency_heading({}, o)}>
        <Row sample="currency" label={m.currency_label({}, o)}>{m.currency_value({ amount: samples.amount }, o)}</Row>
        {extras.currency}
      </Group>
      <Card><CardHeader><CardTitle>{m.plural_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.counts.map(count => <li key={count}><Badge variant="outline" data-count={count}>{m.apps_count({ count }, o)}</Badge></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>{m.ordinal_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.positions.map(n => <li key={n}><Badge variant="outline" data-position={n}>{m.position_value({ n }, o)}</Badge></li>)}</ul></CardContent></Card>
      {extras.after}
    </section>
  </Shell>;
}
