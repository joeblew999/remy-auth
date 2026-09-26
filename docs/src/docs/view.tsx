import { Suspense, use } from 'react';
import { useRouter } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { DocsBody, DocsDescription, DocsPage, DocsTitle, EditOnGitHub, MarkdownCopyButton, PageLastUpdate, ViewOptionsPopover } from 'fumadocs-ui/layouts/notebook/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Banner } from 'fumadocs-ui/components/banner';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { collections } from '../lib/collections';
import type { DocsPageData } from './source.server';
import { WebMCP } from '@/components/webmcp';
import { Mermaid } from '@/components/mermaid';
import { AISearch, AISearchInput, AISearchInputActions, AISearchPanelList } from '@/components/ai/search';
import { askUrl } from './page';
import Link from 'fumadocs-core/link';
import { buttonVariants } from '@/components/ui/button';
import { MessageCircleIcon } from 'lucide-react';
import { docsUrl } from './table.js';
import { docsConfig } from '../../docs.config';
import { sectionTabs } from '@/lib/sections';
import { AiLinks } from '@/components/ai-links';

// Fumadocs UI's own interface text per language (docs/content/ui/<lang>.json; en.json is Fumadocs' defaults,
// the source the translation tools compare against). A language without a file shows English.
const uiText = import.meta.glob<Record<string, string>>('../../content/ui/*.json', { eager: true, import: 'default' });
const uiTextFor = (lang: string) => uiText[`../../content/ui/${lang}.json`];

// A docs page, as Fumadocs' TanStack Start template renders one: RootProvider (theme, search dialog,
// languages), DocsLayout (sidebar from the page tree, mobile menu, language and theme switches) and
// DocsPage (table of contents, breadcrumb, previous and next), with Fumadocs UI's MDX components, in
// shadcn's colours (fumadocs-ui/css/shadcn.css). Each site's languages are its own (i18n.json). Ours:
// relative links between docs files resolve through the map the server sends (the loader stays on
// the server), and the theme is saved under the site's key, so a choice carries between site and docs.

/** A relative link in the Markdown (./gui.md#x) as the page's language's URL, from the server's map. */
function resolve(page: DocsPageData, href?: string) {
  if (!href || /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) return href;
  const [path, hash] = href.split('#');
  const url = page.links[path!.replace(/^\.\//, '')];
  return url ? `${url}${hash ? `#${hash}` : ''}` : href;
}

function Article({ page }: { page: DocsPageData }) {
  const entry = collections[page.site].getPage(page.path);
  if (!entry) throw new Error(`unknown docs page: ${page.path}`);
  const { toc } = use(entry.load());
  const MDX = entry.body;
  const { a: A, Card } = defaultMdxComponents;
  const components = {
    ...defaultMdxComponents, Mermaid, TypeTable, File, Files, Folder, Banner, Tab, Tabs, Step, Steps, Accordion, Accordions,
    a: (props: React.ComponentProps<'a'>) => <A {...props} href={resolve(page, props.href)} />,
    Card: (props: React.ComponentProps<typeof Card>) => <Card {...props} href={resolve(page, props.href)} />,
  };
  return <DocsPage toc={toc} tableOfContent={{ style: 'clerk' }}>
    <DocsTitle>{page.title}</DocsTitle>
    {page.description && <DocsDescription className="mb-0">{page.description}</DocsDescription>}
    <div className="flex flex-row items-center gap-2 border-b pb-6">
      <MarkdownCopyButton markdownUrl={page.markdownUrl} />
      <ViewOptionsPopover markdownUrl={page.markdownUrl} githubUrl={page.githubUrl} />
    </div>
    <DocsBody>
      <MDX components={components} />
    </DocsBody>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <EditOnGitHub href={page.githubUrl} />
      {page.lastModified && <PageLastUpdate date={new Date(page.lastModified)} />}
    </div>
  </DocsPage>;
}

/**
 * The site's Ask AI page: the question at the top, held under the header as the answers grow below it,
 * so it is always in view and above a phone's keyboard; the answers in the page's own scroll.
 */
function AskArticle({ page }: { page: DocsPageData }) {
  return <DocsPage toc={[]} full>
    <DocsTitle>Ask AI</DocsTitle>
    <DocsDescription className="mb-0">Answers from the {docsConfig.titles[page.site]}, written by AI: check them against the pages they link.</DocsDescription>
    <div className="sticky top-(--fd-header-height) z-10 -mx-1 bg-fd-background px-1 py-3">
      <div className="rounded-xl border bg-fd-secondary text-fd-secondary-foreground shadow-sm has-focus-visible:shadow-md">
        <AISearchInput />
        <div className="flex items-center gap-1.5 p-1 empty:hidden"><AISearchInputActions /></div>
      </div>
    </div>
    <AISearchPanelList className="overflow-visible" style={{ maskImage: 'none' }} empty="Ask a question above." />
  </DocsPage>;
}

export function DocsView({ page }: { page: DocsPageData & { ask?: boolean } }) {
  const { pageTree } = useFumadocsLoader({ pageTree: page.pageTree });
  // next-themes' theme script needs the response's CSP nonce, as every script here does (src/router.tsx).
  const nonce = useRouter().options.ssr?.nonce;
  return <RootProvider
    theme={{ storageKey: 'theme', attribute: 'class', defaultTheme: 'system', enableSystem: true, nonce }}
    search={{ options: { api: `/api/search/${page.site}` } }}
    i18n={{
      locale: page.lang,
      locales: page.languages.map(value => ({ locale: value, name: new Intl.DisplayNames([value], { type: 'language' }).of(value) ?? value })),
      onLocaleChange: value => { window.location.href = docsUrl(page.site, page.slug, value); },
      translations: uiTextFor(page.lang),
    }}>
    {/* The docs as tools for agents in the browser (WebMCP, experimental): `docs:cli feature webmcp`. */}
    <WebMCP site={page.site} lang={page.lang} />
    {/* Ask AI: its own page (/<site>/<lang?>/ask), one normal page with one scroll, never an overlay: Fumadocs'
        chat pieces (docs:cli feature ai) answered by AI Search over this site's pages in this language. The
        chat stays mounted across the site's pages, so a conversation survives moving between them. */}
    <AISearch api={`/api/chat/${page.site}?lang=${page.lang}`}>
    {!page.ask && <Link href={askUrl(page)} className={`${buttonVariants({ variant: 'secondary' })} fixed bottom-4 end-4 z-20 gap-2 rounded-2xl text-fd-muted-foreground shadow-lg`}>
      <MessageCircleIcon className="size-4.5" />Ask AI
    </Link>}
    <DocsLayout
      tree={pageTree}
      // Fumadocs' Notebook layout: the three docs sections as tabs in the top bar, with the App link, search,
      // language and theme beside them, the same on every docs page; the page list in the sidebar.
      tabMode="navbar"
      tabs={sectionTabs}
      nav={{ title: docsConfig.product, url: '/', mode: 'top' }}
      links={[{ text: 'Site', url: docsConfig.appUrl, external: true }, { text: 'App', url: `${docsConfig.appUrl}/app`, external: true }]}
      sidebar={{ footer: <AiLinks section={page.site} /> }}>
      {page.ask ? <AskArticle page={page} /> : <Suspense><Article page={page} /></Suspense>}
    </DocsLayout>
    </AISearch>
  </RootProvider>;
}
