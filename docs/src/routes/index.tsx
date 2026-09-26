import { createFileRoute, useRouter } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { AppWindow, BookOpen, Code, Braces, Bot } from 'lucide-react';
import { docsConfig } from '../../docs.config';

// The one URL into everything: the live app, the users' guide, the developer docs, the API reference and
// the docs for AI tools, as a Fumadocs home page (HomeLayout, Cards).
export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: docsConfig.product }, { name: 'description', content: `${docsConfig.product}: the app, its guide, its developer docs and its API reference.` }] }),
  component: Home,
});

function Home() {
  const nonce = useRouter().options.ssr?.nonce;
  return <RootProvider theme={{ storageKey: 'theme', attribute: 'class', defaultTheme: 'system', enableSystem: true, nonce }} search={{ enabled: false }}>
    <HomeLayout nav={{ title: docsConfig.product, url: '/' }} links={[
      { text: 'Guide', url: '/docs' }, { text: 'Developers', url: '/dev' }, { text: 'API reference', url: '/reference' },
      { text: 'App', url: docsConfig.appUrl, external: true },
    ]}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">{docsConfig.product}</h1>
        <Cards>
          <Card icon={<AppWindow />} title="The app" href={docsConfig.appUrl}>The live app, {docsConfig.appUrl.replace('https://', '')}.</Card>
          <Card icon={<BookOpen />} title="Guide" href="/docs">For people using the app: languages, formats, questions.</Card>
          <Card icon={<Code />} title="Developer docs" href="/dev">Building with it: principles, tooling, the shared UI package, mise tasks.</Card>
          <Card icon={<Braces />} title="API reference" href="/reference">Every endpoint of the contract, with a playground.</Card>
          <Card icon={<Bot />} title="Docs in your AI tools" href="/dev/ai-tools">MCP servers, llms.txt and Markdown pages.</Card>
        </Cards>
      </main>
    </HomeLayout>
  </RootProvider>;
}
