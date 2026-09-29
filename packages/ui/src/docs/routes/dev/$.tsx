import { createFileRoute, notFound } from '@tanstack/react-router';
import { docsHead, loadDocsPage } from '../../docs/page';
import { DocsView } from '../../docs/view';

// Every page of the developer docs (/dev, /dev/<lang>/<page>), from its Fumadocs loader.
export const Route = createFileRoute('/dev/$')({
  loader: async ({ params }) => (await loadDocsPage('dev', params._splat ?? '')) ?? (() => { throw notFound(); })(),
  head: ({ loaderData }) => docsHead(loaderData),
  component: () => <DocsView page={Route.useLoaderData()} />, // ask: the site's Ask AI page (docs/page.ts)
});
