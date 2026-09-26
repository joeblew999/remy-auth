import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './components/card';

// The formats page's label/value rows, in a module of their own: the showcase modules whose route
// options run in every page's first load (search params, time zones) use them, and importing them
// from ./pages would bring the whole home and formats pages along. ./pages re-exports them.

/**
 * A titled card of label/value rows on the formats page; `note`, what the rows rest on, goes in the card's
 * footer, so every section is cards only. Other props (data attributes) go on the card.
 */
export function Group({ title, note, children, ...rest }: { title: string; note?: React.ReactNode; children: React.ReactNode } & Record<string, unknown>) {
  return <Card {...rest}><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent><dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">{children}</dl></CardContent>
    {note && <CardFooter className="text-sm leading-relaxed text-muted-foreground">{note}</CardFooter>}</Card>;
}

/**
 * Names in several scripts as one list in the page's language (Intl.ListFormat), each name isolated
 * (bdi, its own direction and language when given), so an Arabic or Hebrew name does not reorder the
 * commas and names around it.
 */
export function NameList({ locale, names, langOf }: { locale: string; names: string[]; langOf?: (name: string) => string | undefined }) {
  return <>{new Intl.ListFormat(locale, { type: 'conjunction' }).formatToParts(names).map((part, index) => part.type === 'element'
    ? <bdi key={index} className="whitespace-nowrap" lang={langOf?.(part.value)}>{part.value}</bdi> : part.value)}</>;
}
/** One row; `sample` becomes data-sample, which the shared checks read. */
export function Row({ sample, label, children, ...rest }: { sample: string; label: string; children: React.ReactNode } & Record<string, unknown>) {
  return <><dt className="text-muted-foreground">{label}</dt><dd data-sample={sample} className="tabular-nums [overflow-wrap:anywhere]" {...rest}>{children}</dd></>;
}
