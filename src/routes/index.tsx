import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { HomePage } from '@joeblew999/remy-ui/pages';
import { docsHomeCards } from '../docs/header-link';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { problemPages } from '@joeblew999/remy-ui/problem';

// A site page: complete in the server's HTML without JavaScript.
export const Route = createFileRoute('/')({
  head: () => pageHead({ path: '', title: locale => m.home_title({}, { locale }), description: locale => m.home_description({}, { locale }) }),
  component: Home,
  ...problemPages,
});

function Home() {
  const locale = getLocale();
  // This app's own destinations beside the shared ones: its docs, on the docs Worker.
  return <HomePage locale={locale} preferred={usePreferred()} cards={docsHomeCards(locale)} />;
}
