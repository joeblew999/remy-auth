import { Link } from '@tanstack/react-router';
import { locales, getTextDirection as direction, type Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { localeName } from './locale';
import { formatLocale, weekdayName, weekOrder, words, type LocaleInfo } from './locale-info';
import { DeviceTime } from './client';
import { samples } from './samples.js';
import { Badge } from './components/badge';
import { buttonVariants } from './components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/card';
import { LanguagesIcon, ListChecksIcon, PaletteIcon, PanelsTopLeftIcon } from 'lucide-react';

// The pages every Remy app built on this package shows, and that the shared checks test.
// Apps keep their route modules (loaders, head, runtime wiring) and render these.
// In-app links are TanStack Links to de-localized paths: the router's rewrite (localeRewrite in
// ./tanstack) adds the page's locale, and they preload on intent. Language changes stay full
// navigations through the plain anchors of LanguageSwitcher, LanguageLinks and LanguageHint.
// The site frame lives in ./shell (re-exported here), so a page that needs only the frame
// does not download these pages.

export { sitePaths, appPaths, allPaths, isAppPath } from './paths.js';

export { SkipLink, ZoneBadge, SiteNavLinks, SourceLink, SiteShell, Shell, Intro } from './shell';
export { Group, Row, NameList } from './rows';
import { Shell, Intro } from './shell';
import { Group, Row, NameList } from './rows';

/**
 * A card on the home page that leads somewhere: what the place is, then a link to it. shadcn has no
 * landing-page block, so this composes its Card the way dashboard-01's section cards do.
 */
export function HomeCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="h-full">
    <CardHeader><CardTitle className="text-lg">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardFooter className="mt-auto">{children}</CardFooter>
  </Card>;
}

/**
 * The home page: what Remy is, where to go from here and what every Remy app shares, all from what
 * the package really provides. `cards` are an app's own destinations beside the shared ones (remy-auth
 * adds its docs); `children` go under the page's links, for example an app's live status.
 */
export function HomePage({ locale, preferred, cards, children }: { locale: Locale; preferred?: Locale; cards?: React.ReactNode; children?: React.ReactNode }) {
  const o = { locale };
  const count = new Intl.NumberFormat(formatLocale(locale)).format(locales.length);
  const shared = [
    [PaletteIcon, m.home_shared_components_title({}, o), m.home_shared_components_text({}, o)],
    [LanguagesIcon, m.home_shared_languages_title({}, o), m.home_shared_languages_text({ count }, o)],
    [PanelsTopLeftIcon, m.home_shared_pages_title({}, o), m.home_shared_pages_text({}, o)],
    [ListChecksIcon, m.home_shared_checks_title({}, o), m.home_shared_checks_text({}, o)],
  ] as const;
  return <Shell locale={locale} preferred={preferred}>
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-6">
        <Intro locale={locale} back={false} label={m.public_label({}, o)} title={m.home_title({}, o)} intro={m.home_intro({}, o)} />
        <div className="flex flex-wrap gap-3">
          <Link className={buttonVariants({ size: 'lg' })} to="/app/demo" preload="intent">{m.demo_link({}, o)}</Link>
          <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} to="/formats" preload="intent">{m.formats_link({}, o)}</Link>
        </div>
        {children}
      </section>
      <section aria-labelledby="home-pages" className="flex flex-col gap-4">
        <h2 id="home-pages" className="text-2xl font-semibold tracking-tight">{m.home_pages_heading({}, o)}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <HomeCard title={m.formats_title({}, o)} description={m.formats_description({}, o)}>
            <Link className={buttonVariants({ variant: 'outline' })} to="/formats" preload="intent">{m.home_formats_open({}, o)}</Link>
          </HomeCard>
          <HomeCard title={m.home_app_title({}, o)} description={m.app_home_description({}, o)}>
            <Link className={buttonVariants({ variant: 'outline' })} to="/app" preload="intent">{m.home_app_open({}, o)}</Link>
          </HomeCard>
          {cards}
        </div>
      </section>
      <section aria-labelledby="home-shared" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="home-shared" className="text-2xl font-semibold tracking-tight">{m.home_shared_heading({}, o)}</h2>
          <p className="max-w-2xl text-muted-foreground">{m.home_shared_intro({}, o)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shared.map(([Icon, title, text]) => <Card key={title} className="h-full">
            <CardHeader>
              <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{text}</CardDescription>
            </CardHeader>
          </Card>)}
        </div>
      </section>
    </div>
  </Shell>;
}

/**
 * What an app adds to the formats content: rows inside the shared groups (`language`, `systems`,
 * `dates`, `currency`) and whole cards in a section (`time`, `numbers`, `money`, `words`).
 */
export type FormatsExtras = {
  language?: React.ReactNode; systems?: React.ReactNode; dates?: React.ReactNode; currency?: React.ReactNode;
  time?: React.ReactNode; words?: React.ReactNode;
  /** Rows added to the Numbers card. */
  numbers?: React.ReactNode;
  /** What the currency card's values rest on, in its footer. */
  currencyNote?: React.ReactNode;
};
/** The search-param controls, each shown in the section it changes (showcase/search-params: choiceCards). */
export type FormatsControlCards = { calendar?: React.ReactNode; numbering?: React.ReactNode; currency?: React.ReactNode; count?: React.ReactNode };

/**
 * One section of the formats page: a heading, what it shows, then its cards in a responsive grid (two
 * per row on wide screens, every section alike); `single` keeps one column, for a section beside the intro.
 */
function FormatsSection({ id, title, note, single = false, children }: { id: string; title: string; note: string; single?: boolean; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-20 flex-col gap-4">
    <div className="flex flex-col gap-1">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
    <div className={single ? 'grid items-start gap-4' : 'grid items-start gap-4 md:grid-cols-2'}>{children}</div>
  </section>;
}

/**
 * The formats page's content, the same on the site page and the app page (each wraps it in its own
 * frame), in five sections by the question a reader asks: this language, dates and times, numbers,
 * money and words. Every section opens with what it is for the page's language (the card marked
 * data-own-area, all derived from the locale), then its samples, then its control where it has one.
 */
export function FormatsContent({ locale, info, extras = {}, controls = {}, backTo = '/' }: { locale: Locale; info: LocaleInfo; extras?: FormatsExtras; controls?: FormatsControlCards; backTo?: '/' | '/app' }) {
  const o = { locale };
  const dir = direction(locale);
  const format = formatLocale(locale);
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const currencyName = new Intl.DisplayNames([locale], { type: 'currency' });
  const title = m.home_title({}, o);
  const titleWords = words(locale, title);
  const sections = [
    ['language', m.section_language({}, o)], ['time', m.section_time({}, o)], ['numbers', m.section_numbers({}, o)],
    ['money', m.section_money({}, o)], ['words', m.section_words({}, o)],
  ] as const;
  return <div className="flex flex-col gap-10">
    {/* On wide screens the intro and "This language" sit side by side, so the first screen is full. */}
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Intro locale={locale} label={m.formats_label({}, o)} title={m.formats_title({}, o)} intro={m.formats_intro({}, o)} back={backTo === '/app'} backTo={backTo} />
        <nav aria-label={m.sections_nav({}, o)} className="flex flex-wrap gap-2">
          {sections.map(([id, title]) => <a key={id} className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`#${id}`}>{title}</a>)}
        </nav>
      </div>
      <FormatsSection id="language" title={m.section_language({}, o)} note={m.section_language_note({}, o)} single>
        <Group title={m.language_label({}, o)} data-own-area="language">
          <Row sample="tag" label={m.language_tag({}, o)}><code>{locale}</code></Row>
          <Row sample="name" label={m.language_name({}, o)}>{localeName(locale)}</Row>
          <Row sample="direction" label={m.direction_label({}, o)} data-direction={dir}>{dir === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o)}</Row>
          {/* Each name isolated (bdi, in its own language), so an Arabic or Persian name keeps its own
              direction without reordering the commas and names around it. */}
          <Row sample="languages" label={m.languages_available({}, o)}><NameList locale={locale} names={locales.map(value => localeName(value))} langOf={name => locales.find(value => localeName(value) === name)} /></Row>
          {/* Capitals come from CSS in the page's language (its lang), so Turkish gets İ from i. */}
          <Row sample="casing-row" label={m.casing_label({}, o)}>{samples.casing} → <span className="uppercase" data-sample="casing">{samples.casing}</span></Row>
          {extras.language}
        </Group>
      </FormatsSection>
    </div>
    <FormatsSection id="time" title={m.section_time({}, o)} note={m.section_time_note({}, o)}>
      <Group title={m.systems_heading({}, o)} data-own-area="time">
        <Row sample="calendar" label={m.calendar_label({}, o)}>{calendarName.of(info.calendar)}</Row>
        <Row sample="hour-cycle" label={m.hour_cycle_label({}, o)}>{['h11', 'h12'].includes(info.hourCycle) ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o)}</Row>
        <Row sample="week-start" label={m.week_start_label({}, o)}>{weekdayName(locale, info.firstDay)}</Row>
        <Row sample="weekend" label={m.weekend_label({}, o)}>{list.format(info.weekend.map(day => weekdayName(locale, day)))}</Row>
        <Row sample="week" label={m.week_label({}, o)}>
          <ol className="flex flex-wrap gap-1">{weekOrder(info.firstDay).map(day => <li key={day}>
            <Badge variant={info.weekend.includes(day) ? 'secondary' : 'outline'} data-weekday={day} data-weekend={info.weekend.includes(day) || undefined}>{weekdayName(locale, day, 'short')}</Badge>
          </li>)}</ol>
        </Row>
        {extras.systems}
      </Group>
      <Group title={m.dates_heading({}, o)}>
        <Row sample="instant" label={m.instant_label({}, o)}><time dateTime={samples.instant.toISOString()}>{m.instant_value({ instant: samples.instant }, o)}</time></Row>
        <Row sample="date" label={m.plain_date_label({}, o)}><time dateTime={samples.date.toISOString().slice(0, 10)}>{m.plain_date_value({ date: samples.date }, o)}</time></Row>
        {extras.dates}
        <Row sample="relative" label={m.relative_label({}, o)}>{m.relative_value({ days: samples.days }, o)}</Row>
        <Row sample="local-row" label={m.local_time_label({}, o)}><DeviceTime locale={locale} instant={samples.instant} data-sample="local" /></Row>
      </Group>
      {controls.calendar}
      {extras.time}
    </FormatsSection>
    <FormatsSection id="numbers" title={m.section_numbers({}, o)} note={m.section_numbers_note({}, o)}>
      <Group title={m.numbers_heading({}, o)} data-own-area="numbers">
        <Row sample="numbering" label={m.numbering_label({}, o)}><code>{info.numberingSystem}</code> · {new Intl.NumberFormat(format).format(samples.decimal)}</Row>
        <Row sample="decimal" label={m.decimal_label({}, o)}>{m.decimal_value({ value: samples.decimal }, o)}</Row>
        <Row sample="percent" label={m.percent_label({}, o)}>{m.percent_value({ value: samples.share }, o)}</Row>
        <Row sample="compact" label={m.compact_label({}, o)}>{m.compact_value({ value: samples.big }, o)}</Row>
        {extras.numbers}
      </Group>
      {controls.numbering}
    </FormatsSection>
    <FormatsSection id="money" title={m.section_money({}, o)} note={m.section_money_note({}, o)}>
      <Group title={m.currency_heading({}, o)} note={extras.currencyNote} data-own-area="money">
        {/* The currency of the language's region (Intl.Locale maximize, then country-to-currency). */}
        <Row sample="currency" label={currencyName.of(info.currency) ?? info.currency} data-value={info.currency}>{new Intl.NumberFormat(format, { style: 'currency', currency: info.currency }).format(samples.amount)}</Row>
        {extras.currency}
      </Group>
      {controls.currency}
    </FormatsSection>
    <FormatsSection id="words" title={m.section_words({}, o)} note={m.section_words_note({}, o)}>
      <Card data-own-area="words"><CardHeader><CardTitle>{m.plural_heading({}, o)}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Each of this language's plural forms once, at the smallest count that takes it (Intl.PluralRules). */}
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">
            <Row sample="plural-forms" label={m.section_language({}, o)}>{list.format(info.counts.map(count => m.apps_count({ count }, o)))}</Row>
          </dl>
          <ul className="flex flex-wrap gap-2">{samples.counts.map(count => <li key={count}><Badge variant="outline" data-count={count}>{m.apps_count({ count }, o)}</Badge></li>)}</ul></CardContent></Card>
      {controls.count}
      <Card><CardHeader><CardTitle>{m.ordinal_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.positions.map(n => <li key={n}><Badge variant="outline" data-position={n}>{m.position_value({ n }, o)}</Badge></li>)}</ul></CardContent></Card>
      <Group title={m.word_breaks_heading({}, o)}>
        {/* Intl.Segmenter finds the words, also in languages written without spaces (Thai, Japanese). */}
        <Row sample="words-row" label={m.words_label({}, o)}>
          <ul className="flex flex-wrap gap-1" data-sample="words">{titleWords.map((word, index) => <li key={index}><Badge variant="outline" data-word={word}>{word}</Badge></li>)}</ul>
        </Row>
        <Row sample="word-count" label={m.word_count_label({}, o)}>{new Intl.NumberFormat(format).format(titleWords.length)}</Row>
        {/* A long German word breaks by German hyphenation (hyphens: auto, text.css) wherever it is shown. */}
        <Row sample="long-word" label={m.long_word_label({}, o)}><span lang="de">{samples.longWord}</span></Row>
      </Group>
      {extras.words}
    </FormatsSection>
  </div>;
}

/** The formats site page: FormatsContent in the site frame, complete without JavaScript. */
export function FormatsPage({ locale, info, preferred, extras = {}, controls = {} }: { locale: Locale; info: LocaleInfo; preferred?: Locale; extras?: FormatsExtras; controls?: FormatsControlCards }) {
  return <Shell locale={locale} path="/formats" preferred={preferred}><FormatsContent locale={locale} info={info} extras={extras} controls={controls} /></Shell>;
}
