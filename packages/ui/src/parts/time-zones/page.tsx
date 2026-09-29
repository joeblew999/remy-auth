import { Link } from '@tanstack/react-router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/breadcrumb';
import type { Locale } from '../../paraglide/runtime.js';
import { m } from '../../paraglide/messages.js';
import { Shell } from '../../shell';
import { Group, Row } from '../../rows';
import { samples } from '../../samples.js';
import { formatLocale } from '../../locale-info';
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
          <BreadcrumbItem><BreadcrumbLink render={<Link to="/formats" preload="intent" />}>{m.nav_formats({}, o)}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator/>
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
