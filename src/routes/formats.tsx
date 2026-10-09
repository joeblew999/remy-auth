import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { choiceCards, searchDefaults } from '@joeblew999/remy-showcase/search-params';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { FormatsPage } from '@joeblew999/remy-showcase/pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { formatsExtras } from '../formats-extras';
import { formatsRouteOptions } from '../formats-route';
import { problemPages } from '@joeblew999/remy-ui/problem';

// The formats site page: complete without JavaScript, for Google.
export const Route = createFileRoute('/formats')({
  ...formatsRouteOptions,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  head: () => pageHead({ path: '/formats', title: locale => m.formats_title({}, { locale }), description: (locale, product) => m.formats_description({ product }, { locale }) }),
  component: Formats,
  ...problemPages,
});

function Formats() {
  const { info, place } = Route.useLoaderData();
  const locale = getLocale();
  return <FormatsPage locale={locale} info={info}
    extras={formatsExtras({ locale, info, place })} controls={choiceCards({ locale, search: Route.useSearch(), to: '/formats' })} />;
}
