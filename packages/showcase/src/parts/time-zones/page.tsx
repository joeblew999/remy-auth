/// <reference path="../virtual.d.ts" />
import { Link } from '@tanstack/react-router';
import { parent } from 'virtual:remy-parts/time-zones/app';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@joeblew999/remy-ui/components/breadcrumb';
import type { Locale } from '@joeblew999/remy-ui/runtime';
import { m } from '@joeblew999/remy-ui/messages';
import { Shell } from '@joeblew999/remy-ui/shell';
import { Group, Row } from '@joeblew999/remy-ui/rows';
import { samples } from '@joeblew999/remy-ui/samples';
import { formatLocale } from '@joeblew999/remy-ui/locale-info';
import { canonicalTimeZone, timeZoneName, timeZonePath } from './names';

export { canonicalTimeZone, timeZoneName, timeZonePath };

export function TimeZonePage({ locale, zone, preferred }: { locale: Locale; zone: string; preferred?: Locale }) {
  const o = { locale };
  return <Shell locale={locale} path={timeZonePath(zone)} preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink render={<Link to="/" preload="intent" />}>{m.home_link({}, o)}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator/>
          {/* The app's page above a zone (src/parts/time-zones.ts `parent`), if it names one: remy-auth's formats page. */}
          {parent && <>
            <BreadcrumbItem><BreadcrumbLink render={<Link {...parent.link} preload="intent" />}>{parent.label(locale)}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator/>
          </>}
          <BreadcrumbItem><BreadcrumbPage>{timeZoneName(locale, zone, 'longGeneric')}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.formats_label({}, o)}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{timeZoneName(locale, zone, 'longGeneric')}</h1>
      <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{m.zone_intro({}, o)}</p>
      <Group title={m.timezone_heading({}, o)}>
        <Row sample="zone" label={m.zone_id_label({}, o)}><bdi>{zone}</bdi></Row>
        <Row sample="zone-offset" label={m.utc_offset_label({}, o)}>{timeZoneName(locale, zone, 'longOffset')}</Row>
        <Row sample="zone-local" label={m.cf_local_time_label({}, o)}>{new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: 'full', timeStyle: 'long', timeZone: zone }).format(samples.instant)}</Row>
      </Group>
    </section>
  </Shell>;
}
