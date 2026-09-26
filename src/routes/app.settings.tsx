import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { SettingsPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { problemPages } from '@joeblew999/remy-ui/problem';

// The app's settings page (the shared SettingsPage): language, appearance, and what the device tells the app.
export const Route = createFileRoute('/app/settings')({
  head: () => pageHead({ path: '/app/settings', title: locale => m.settings_title({}, { locale }), description: locale => m.settings_description({}, { locale }) }),
  component: Settings,
  ...problemPages,
});

function Settings() {
  return <SettingsPage locale={getLocale()} preferred={usePreferred()} />;
}
