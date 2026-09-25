import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { searchDefaults } from '@joeblew999/remy-ui/showcase/search-params';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { AppFormatsPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { formatsExtras, formatsRouteOptions } from '../formats-extras';
import { usePreferred } from '../preferred';
import { problemPages } from '../problem';

// The formats page inside the app: the same content and rows as the site page, in the app frame.
export const Route = createFileRoute('/app/formats')({
  ...formatsRouteOptions,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  head: () => pageHead({ path: '/app/formats', title: locale => m.formats_title({}, { locale }), description: locale => m.formats_description({}, { locale }) }),
  component: Formats,
  ...problemPages,
});

function Formats() {
  const { info, place } = Route.useLoaderData();
  const locale = getLocale();
  return <AppFormatsPage locale={locale} info={info} preferred={usePreferred()}
    extras={formatsExtras({ locale, info, place, search: Route.useSearch(), to: '/app/formats' })} />;
}
