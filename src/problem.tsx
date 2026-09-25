import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { Button } from '@joeblew999/remy-ui/button';
import { Shell } from '@joeblew999/remy-ui/pages';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@joeblew999/remy-ui/components/empty';
import { buttonVariants } from '@joeblew999/remy-ui/components/button';

// The localized problem pages, kept out of search results. The root route uses them for unknown
// paths and failures outside any page; every page route sets them too (`...problemPages`), so a
// page's own loader failing or throwing notFound() renders them in place of that page. The server
// answers 404 for a not-found and 500 for an error (TanStack Start's status from the matches).

/** The localized not-found page (HTTP 404). */
export function NotFound() {
  return <Problem missing />;
}

/**
 * The localized error page (HTTP 500 when the server renders it). It never shows the error
 * itself: messages and stacks stay in the Worker's logs. Retry re-runs the failed loaders
 * (router.invalidate() also resets the error boundary).
 */
export function ErrorPage(_: ErrorComponentProps) {
  const router = useRouter();
  const locale = getLocale();
  return <Problem missing={false}>
    <Button variant="outline" onClick={() => router.invalidate()}>{m.retry({}, { locale })}</Button>
  </Problem>;
}

/** A route's not-found and error components, for one spread line in each page route. */
export const problemPages = { notFoundComponent: NotFound, errorComponent: ErrorPage };

/** The page itself; `detail` replaces the default explanation, for example to name the missing resource. */
export function Problem({ missing, detail, children }: { missing: boolean; detail?: string; children?: React.ReactNode }) {
  const locale = getLocale();
  const title = missing ? m.not_found({}, { locale }) : m.error_title({}, { locale });
  return <Shell locale={locale}><Empty data-problem={missing ? 'not-found' : 'error'}><meta name="robots" content="noindex" />
    <title>{title}</title>
    <EmptyHeader>
      <EmptyTitle><h1 className="text-2xl font-semibold tracking-tight">{title}</h1></EmptyTitle>
      <EmptyDescription><p>{detail ?? (missing ? m.not_found_detail({}, { locale }) : m.error_detail({}, { locale }))}</p></EmptyDescription>
    </EmptyHeader>
    <EmptyContent className="flex-row flex-wrap justify-center">
      {children}
      <a className={buttonVariants({ variant: 'link' })} href={`/${locale}`}>{m.home_link({}, { locale })}</a>
    </EmptyContent>
  </Empty></Shell>;
}
