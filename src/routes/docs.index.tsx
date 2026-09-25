import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { docsHead, loadDocsPage } from '../docs/page';
import { DocsView } from '../docs/view';
import { usePreferred } from '../preferred';
import { problemPages } from '../problem';

// The docs home, /docs: the repository's README, a site page (.plans/docs-site.md).
export const Route = createFileRoute('/docs/')({
  loader: () => loadDocsPage(''),
  head: ({ loaderData }) => docsHead(loaderData),
  component: Docs,
  ...problemPages,
});

function Docs() {
  return <DocsView locale={getLocale()} page={Route.useLoaderData()} preferred={usePreferred()} />;
}
