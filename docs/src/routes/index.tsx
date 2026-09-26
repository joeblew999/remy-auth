import { createFileRoute, useRouter } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { AppWindow, BookOpen, Code, Braces, Bot } from 'lucide-react';
import { docsConfig } from '../../docs.config';
import { sections } from '@/lib/sections';
import { docsOrigin } from '@/lib/origin';

const icons = { docs: <BookOpen />, dev: <Code />, reference: <Braces /> };

// The one URL into everything: the live app, the product guide, the developer docs, the API reference and
// each one's llms.txt and MCP server for AI tools, as a Fumadocs home page (HomeLayout, Cards).
export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: docsConfig.product }, { name: 'description', content: `${docsConfig.product}: the app, its product guide, its developer docs and its API reference, with llms.txt and an MCP server for each.` }] }),
  loader: () => docsOrigin(),
  component: Home,
});

function Home() {
  const nonce = useRouter().options.ssr?.nonce;
  const origin = Route.useLoaderData();
  return <RootProvider theme={{ storageKey: 'theme', attribute: 'class', defaultTheme: 'system', enableSystem: true, nonce }} search={{ enabled: false }}>
    <HomeLayout nav={{ title: docsConfig.product, url: '/' }} links={[
      ...sections.map(section => ({ text: section.title, url: section.base })),
      { text: 'Site', url: docsConfig.appUrl, external: true }, { text: 'App', url: `${docsConfig.appUrl}/app`, external: true },
    ]}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">{docsConfig.product}</h1>
        <Cards>
          <Card icon={<AppWindow />} title="The site" href={docsConfig.appUrl}>The live site, {docsConfig.appUrl.replace('https://', '')}.</Card>
          <Card icon={<AppWindow />} title="The app" href={`${docsConfig.appUrl}/app`}>The app itself.</Card>
          {sections.map(section => <Card key={section.key} icon={icons[section.key]} title={section.title} href={section.base}>{section.audience}.</Card>)}
        </Cards>
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Bot className="size-5" />For AI tools</h2>
          <p className="text-fd-muted-foreground">Each part has its own <a className="underline" href="/llms.txt">llms.txt</a> and MCP server
            (Streamable HTTP; add its URL to ChatGPT, Claude, Cursor, VS Code or Gemini CLI). How: <a className="underline" href="/docs/ai-assistants">for app users</a>, <a className="underline" href="/dev/ai-tools">for developers</a>.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left"><th className="py-1 pe-4">Part</th><th className="py-1 pe-4">llms</th><th className="py-1">MCP server</th></tr></thead>
            <tbody>{sections.map(section => <tr key={section.key} className="border-t align-top">
              <td className="py-2 pe-4"><a className="font-medium underline" href={section.base}>{section.title}</a><br /><span className="text-fd-muted-foreground">{section.audience}</span></td>
              <td className="py-2 pe-4"><a className="underline" href={section.llms}>llms.txt</a> · <a className="underline" href={section.llmsFull}>full</a></td>
              <td className="py-2"><code className="break-all">{origin}{section.mcp}</code></td>
            </tr>)}</tbody>
          </table></div>
        </section>
      </main>
    </HomeLayout>
  </RootProvider>;
}
