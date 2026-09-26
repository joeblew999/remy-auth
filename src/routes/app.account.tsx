import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { AccountPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { problemPages } from '@joeblew999/remy-ui/problem';

// The account page (the shared AccountPage): an empty state until the auth service signs people in.
export const Route = createFileRoute('/app/account')({
  head: () => pageHead({ path: '/app/account', title: locale => m.account_title({}, { locale }), description: locale => m.account_description({}, { locale }) }),
  component: Account,
  ...problemPages,
});

function Account() {
  return <AccountPage locale={getLocale()} preferred={usePreferred()} />;
}
