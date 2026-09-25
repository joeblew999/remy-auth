import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { docsHead, loadDocsPage } from '../docs/page';
import { DocsView } from '../docs/view';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { problemPages } from '@joeblew999/remy-ui/problem';

// A docs page, /docs/<slug>, one per row of the docs table (src/docs/table.js); other slugs are 404s.
export const Route = createFileRoute('/docs/$slug')({
  loader: ({ params }) => loadDocsPage(params.slug),
  head: ({ loaderData }) => docsHead(loaderData),
  component: Docs,
  ...problemPages,
});

function Docs() {
  return <DocsView locale={getLocale()} page={Route.useLoaderData()} preferred={usePreferred()} />;
}
