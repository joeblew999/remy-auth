import { useRouter } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { createOpenAPIPage, type OpenAPIPageProps } from 'fumadocs-openapi/ui';
import type { getReferencePage } from './reference';
import { docsConfig } from '../../docs.config';

// The API reference (/reference), as Fumadocs' OpenAPI example renders it: DocsLayout over the
// reference's own page tree and fumadocs-openapi's page for each operation, in shadcn's colours.
const OpenAPIPage = createOpenAPIPage();

export function ReferenceView({ page }: { page: NonNullable<Awaited<ReturnType<typeof getReferencePage>>> }) {
  const { pageTree } = useFumadocsLoader({ pageTree: page.pageTree });
  // next-themes' theme script needs the response's CSP nonce, as every script here does (src/router.tsx).
  const nonce = useRouter().options.ssr?.nonce;
  return <RootProvider theme={{ storageKey: 'theme', attribute: 'class', defaultTheme: 'system', enableSystem: true, nonce }}
    search={{ options: { api: '/api/search/reference' } }}>
    <DocsLayout tree={pageTree} nav={{ title: docsConfig.titles.reference, url: '/reference' }}
      links={[{ text: 'Developers', url: '/dev' }, { text: 'Guide', url: '/docs' }]}>
      <DocsPage toc={page.toc} full>
        <DocsTitle>{page.title}</DocsTitle>
        {page.description && <DocsDescription>{page.description}</DocsDescription>}
        <DocsBody><OpenAPIPage {...(JSON.parse(page.props) as OpenAPIPageProps)} /></DocsBody>
      </DocsPage>
    </DocsLayout>
  </RootProvider>;
}
