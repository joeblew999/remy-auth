import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { DemoPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { useLeaveGuard } from '@joeblew999/remy-ui/showcase/navigation-blocking';
import { usePreferred } from '../preferred';
import { reserve } from '../reserve';
import { problemPages } from '../problem';

// An app page rendered in the browser only: the server sends the document and its metadata.
export const Route = createFileRoute('/app/demo')({
  ssr: false,
  head: () => pageHead({ path: '/app/demo', title: locale => m.demo_title({}, { locale }), description: locale => m.demo_description({}, { locale }) }),
  component: Demo,
  ...problemPages,
});


function Demo() {
  // The form's own checks run first; the server function checks again and answers in the page's language.
  const reserveOnServer = useServerFn(reserve);
  return <DemoPage locale={getLocale()} preferred={usePreferred()} onReserve={data => reserveOnServer({ data })} onDirtyChange={useLeaveGuard()} />;
}
