import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import remarkDirective from 'remark-directive';
import { remarkAutoTypeTable } from 'fumadocs-typescript';
import { remarkDirectiveAdmonition, remarkMdxMermaid, remarkSteps } from 'fumadocs-core/mdx-plugins';

// The docs Worker, as Fumadocs' TanStack Start template builds (create-fumadocs-app --template
// tanstack-start), on Cloudflare's Vite plugin instead of Nitro.
export default defineConfig({
  plugins: [
    // Fumadocs MDX compiles content/ for the macro collections (src/lib/collections.ts); before Start's plugin.
    // Beyond its defaults (GFM, heading ids, images, code and npm tabs): callouts (:::note), Mermaid
    // (```mermaid), type tables from our TypeScript (<auto-type-table>) and steps. GitHub's "default" code
    // themes keep 4.5:1 comment contrast on both backgrounds, which Lighthouse's accessibility audit requires.
    fumadocsMdx({ globalOptions: { mdxOptions: {
      remarkPlugins: plugins => [remarkDirective, remarkDirectiveAdmonition, remarkMdxMermaid, remarkAutoTypeTable, ...plugins, remarkSteps],
      rehypeCodeOptions: { themes: { light: 'github-light-default', dark: 'github-dark-default' } },
      // Pictures and videos live in public/media and are referenced by URL (Fumadocs' stock option), so the
      // Markdown that llms.txt, the .md pages and MCP serve keeps their real addresses.
      remarkImageOptions: { useImport: false, publicDir: 'public' },
    } } }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({ server: { build: { inlineCss: true } } }),
    viteReact(),
  ],
  // tsconfig.json's paths (`@/` for src), as Fumadocs' template resolves them: the CLI writes `@/lib/...`.
  resolve: { tsconfigPaths: true },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
