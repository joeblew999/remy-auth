import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { DemoPage } from '@joeblew999/remy-ui/pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '../preferred';

// Rendered in the browser only: the server sends the document, its metadata and the pending fallback.
export const Route = createFileRoute('/demo')({
  ssr: false,
  head: () => pageHead({ path: '/demo', title: locale => m.demo_title({}, { locale }), description: locale => m.demo_description({}, { locale }) }),
  pendingComponent: Loading,
  component: Demo,
});

function Loading() {
  return <main className="mx-auto max-w-3xl px-6 py-20"><p role="status">{m.loading({}, { locale: getLocale() })}</p></main>;
}

function Demo() {
  return <DemoPage locale={getLocale()} preferred={usePreferred()} />;
}
