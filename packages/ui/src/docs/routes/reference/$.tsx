import { createFileRoute, notFound } from '@tanstack/react-router';
import { getReferencePage } from '../../docs/reference';
import { ReferenceView } from '../../docs/reference-view';
import { docsConfig } from '@remy-docs-app/docs.config.ts';

// The API reference: /reference and /reference/<operation>, from the oRPC contract's spec.
export const Route = createFileRoute('/reference/$')({
  // An app without an API (remyDocs without `contract`) has no reference.
  loader: async ({ params }) => (__REMY_DOCS_API__ && await getReferencePage({ data: params._splat ?? '' })) || (() => { throw notFound(); })(),
  head: ({ loaderData }) => (loaderData ? {
    meta: [{ title: `${loaderData.title} | ${docsConfig.titles.reference}` }, { name: 'description', content: loaderData.description }],
    links: [{ rel: 'canonical', href: `${loaderData.origin}${loaderData.url}` }],
  } : {}),
  component: () => <ReferenceView page={Route.useLoaderData()} />,
});
