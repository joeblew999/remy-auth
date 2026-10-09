import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { AccountPage } from '@joeblew999/remy-showcase/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { problemPages } from '@joeblew999/remy-ui/problem';
import { accountState } from '../auth/account';
import { SignIn, SignOut } from '../auth/sign-in';

// The account page (the shared AccountPage): who is signed in, or the sign-in form; where no sign-in
// code can be delivered yet, the shared empty state. The loader asks a server function
// (src/auth/account.ts), which calls the contract's `me` inside the server.
export const Route = createFileRoute('/app/account')({
  codeSplitGroupings: [['loader', 'component']],
  loader: () => accountState(),
  // Whoever is signed in can change at any moment in another tab: never serve this from the router's cache.
  staleTime: 0,
  gcTime: 0,
  head: () => pageHead({ path: '/app/account', title: locale => m.account_title({}, { locale }), description: locale => m.account_description({}, { locale }) }),
  component: Account,
  ...problemPages,
});

function Account() {
  const { account, canSignIn } = Route.useLoaderData();
  const locale = getLocale();
  if (!account && !canSignIn) return <AccountPage locale={locale} />;
  return <AccountPage locale={locale} auth={{ account, signIn: <SignIn locale={locale} />, signOut: <SignOut locale={locale} /> }} />;
}
