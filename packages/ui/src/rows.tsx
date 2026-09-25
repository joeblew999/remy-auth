import { Card, CardContent, CardHeader, CardTitle } from './components/card';

// The formats page's label/value rows, in a module of their own: the showcase modules whose route
// options run in every page's first load (search params, time zones) use them, and importing them
// from ./pages would bring the whole home and formats pages along. ./pages re-exports them.

/** A titled card of label/value rows on the formats page. */
export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent><dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">{children}</dl></CardContent></Card>;
}
/** One row; `sample` becomes data-sample, which the shared checks read. */
export function Row({ sample, label, children, ...rest }: { sample: string; label: string; children: React.ReactNode } & Record<string, unknown>) {
  return <><dt className="text-muted-foreground">{label}</dt><dd data-sample={sample} className="tabular-nums [overflow-wrap:anywhere]" {...rest}>{children}</dd></>;
}
