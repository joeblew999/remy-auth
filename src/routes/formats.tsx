import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { choiceCards, searchDefaults } from '@joeblew999/remy-ui/showcase/search-params';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { FormatsPage } from '@joeblew999/remy-ui/pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { formatsExtras, formatsRouteOptions } from '../formats-extras';
import { usePreferred } from '../preferred';
import { problemPages } from '../problem';

// The formats site page: complete without JavaScript, for Google.
export const Route = createFileRoute('/formats')({
  ...formatsRouteOptions,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  head: () => pageHead({ path: '/formats', title: locale => m.formats_title({}, { locale }), description: locale => m.formats_description({}, { locale }) }),
  component: Formats,
  ...problemPages,
});

function Formats() {
  const { info, place } = Route.useLoaderData();
  const locale = getLocale();
  return <FormatsPage locale={locale} info={info} preferred={usePreferred()}
    extras={formatsExtras({ locale, info, place })} controls={choiceCards({ locale, search: Route.useSearch(), to: '/formats' })} />;
}
