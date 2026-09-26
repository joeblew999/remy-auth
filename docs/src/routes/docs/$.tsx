import { createFileRoute, notFound } from '@tanstack/react-router';
import { docsHead, loadDocsPage } from '../../docs/page';
import { DocsView } from '../../docs/view';

// Every page of the users' docs (/docs, /docs/<lang>/<page>), from its Fumadocs loader.
export const Route = createFileRoute('/docs/$')({
  loader: async ({ params }) => (await loadDocsPage('docs', params._splat ?? '')) ?? (() => { throw notFound(); })(),
  head: ({ loaderData }) => docsHead(loaderData),
  component: () => <DocsView page={Route.useLoaderData()} />,
});
