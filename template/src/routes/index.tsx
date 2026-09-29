import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { problemPages } from '@joeblew999/remy-ui/problem';
import { Shell, Intro } from '@joeblew999/remy-ui/shell';
import { m } from '../paraglide/messages.js';

// A site page: complete in the server's HTML without JavaScript, in every language (messages/).
export const Route = createFileRoute('/')({
  head: () => pageHead({ path: '', title: locale => m.app_title({}, { locale }), description: locale => m.app_description({}, { locale }) }),
  component: Home,
  ...problemPages,
});

function Home() {
  const locale = getLocale();
  return <Shell locale={locale}>
    <Intro locale={locale} back={false} title={m.app_title()} intro={m.app_description()} />
  </Shell>;
}
