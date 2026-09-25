import { isDefinedError } from '@orpc/client';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { DemoPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { useLeaveGuard } from '@joeblew999/remy-ui/showcase/navigation-blocking';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { orpc } from '../api/client';
import { problemPages } from '@joeblew999/remy-ui/problem';

// An app page rendered in the browser only: the server sends the document and its metadata.
export const Route = createFileRoute('/app/demo')({
  ssr: false,
  head: () => pageHead({ path: '/app/demo', title: locale => m.demo_title({}, { locale }), description: locale => m.demo_description({}, { locale }) }),
  component: Demo,
  ...problemPages,
});


function Demo() {
  // The form's own checks run first; POST /api/reservations checks again and answers in the page's
  // language. Its typed INVALID_RESERVATION error carries field errors, which the form shows like its own.
  const reservation = useMutation(orpc.reservations.create.mutationOptions());
  const reserve = (data: { name: string; guests: number }) => reservation.mutateAsync(data).then(({ message }) => ({ message }), (error: typeof reservation.error) => {
    if (isDefinedError(error) && error.code === 'INVALID_RESERVATION') return { errors: error.data };
    throw error;
  });
  return <DemoPage locale={getLocale()} preferred={usePreferred()} onReserve={reserve} onDirtyChange={useLeaveGuard()} />;
}
