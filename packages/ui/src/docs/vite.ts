import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import remarkDirective from 'remark-directive';
import { remarkAutoTypeTable } from 'fumadocs-typescript';
import { remarkDirectiveAdmonition, remarkMdxMermaid, remarkSteps } from 'fumadocs-core/mdx-plugins';
import type { RemyDocsConfig } from './config';

// An app's whole docs Worker from its docs.config.ts (.plans/thin-apps.md, group 2): its docs/vite.config.ts
// is `export default remyDocs(docsConfig, { contract: '<its contract package>' })`. The Worker itself is this
// package's src/docs (Fumadocs' TanStack Start template, on Cloudflare's Vite plugin instead of Nitro); the
// app keeps content/ and docs.config.ts. Three things are generated into the app's .remy-docs/ (gitignored):
//   collections.ts: the Fumadocs collections, compiled by fumadocs-mdx's macro, which never compiles
//     node_modules, so they cannot stay in the package;
//   wrangler.json: the Worker's Cloudflare configuration from docs.config.ts, which the Vite plugin and every
//     wrangler command (-c .remy-docs/wrangler.json) read, so the app writes none;
// and the route tree beside the package's routes (TanStack Start's srcDirectory is the package's src/docs).

const packageDocs = fileURLToPath(new URL('.', import.meta.url));

/** The Worker's Cloudflare configuration: its name, the assets, observability and, when the app has Ask AI, its bindings. */
export function docsWorkerConfig(docsConfig: RemyDocsConfig, srcDirectory: string) {
  const { ask } = docsConfig;
  const askBindings = (remote: boolean) => ask ? {
    ai_search: [{ binding: 'DOCS_SEARCH', instance_name: ask.instance, ...(remote ? { remote: true } : {}) }],
    ratelimits: [{ name: 'ASK_LIMIT', namespace_id: ask.rateLimitNamespace, simple: { limit: 10, period: 60 } }],
  } : {};
  return {
    name: docsConfig.service,
    compatibility_date: '2026-09-24',
    main: `${srcDirectory}/server.ts`,
    compatibility_flags: ['nodejs_compat'],
    version_metadata: { binding: 'CF_VERSION_METADATA' },
    vars: { ENVIRONMENT: 'production' },
    assets: { directory: './dist/client' },
    preview_urls: false,
    ...askBindings(false),
    // Working on answers (CLOUDFLARE_ENV=ask mise run docs:dev): the same Worker locally, AI Search remote. Never deployed.
    ...(ask ? { env: { ask: { vars: { ENVIRONMENT: 'docs' }, version_metadata: { binding: 'CF_VERSION_METADATA' }, ...askBindings(true) } } } : {}),
    observability: {
      enabled: true,
      redact_query_string: true,
      logs: { enabled: true, invocation_logs: true, persist: true, head_sampling_rate: 1 },
      traces: { enabled: true, persist: true, head_sampling_rate: 1 },
    },
  };
}

/**
 * The docs Worker's Vite configuration for the app whose docs/ it runs in. `contract`: the package of the
 * app's oRPC contract, which /reference documents; an app without an API leaves it out.
 */
export function remyDocs(docsConfig: RemyDocsConfig, { contract = join(packageDocs, 'empty-contract.ts'), root = process.cwd() }: { contract?: string; root?: string } = {}): UserConfig {
  const app = root.endsWith('/') ? root : `${root}/`;
  const srcDirectory = relative(root, packageDocs).replace(/\/$/, '');
  const generated = join(root, '.remy-docs');
  mkdirSync(generated, { recursive: true });
  writeFileSync(join(generated, 'collections.ts'), readFileSync(join(packageDocs, 'lib/collections.source.ts'), 'utf8'));
  writeFileSync(join(generated, 'wrangler.json'), `${JSON.stringify({ ...docsWorkerConfig(docsConfig, `../${srcDirectory}`), assets: { directory: '../dist/client' } }, null, 2)}\n`);
  return defineConfig({
    plugins: [
      // Fumadocs MDX compiles content/ for the collections (.remy-docs/collections.ts); before Start's plugin.
      // Beyond its defaults (GFM, heading ids, images, code and npm tabs): callouts (:::note), Mermaid
      // (```mermaid), type tables from TypeScript (<auto-type-table>) and steps. GitHub's "default" code
      // themes keep 4.5:1 comment contrast on both backgrounds, which Lighthouse's accessibility audit requires.
      fumadocsMdx({ macro: { include: ['**/.remy-docs/collections.ts'] }, globalOptions: { mdxOptions: {
        remarkPlugins: plugins => [remarkDirective, remarkDirectiveAdmonition, remarkMdxMermaid, remarkAutoTypeTable, ...plugins, remarkSteps],
        rehypeCodeOptions: { themes: { light: 'github-light-default', dark: 'github-dark-default' } },
        // Pictures and videos live in public/media and are referenced by URL (Fumadocs' stock option), so the
        // Markdown that llms.txt, the .md pages and MCP serve keeps their real addresses.
        remarkImageOptions: { useImport: false, publicDir: 'public' },
      } } }),
      cloudflare({ viteEnvironment: { name: 'ssr' }, configPath: join(generated, 'wrangler.json') }),
      tailwindcss(),
      tanstackStart({ srcDirectory, server: { build: { inlineCss: true } } }),
      viteReact(),
    ],
    resolve: {
      alias: [
        // The app's own modules the Worker imports (app-modules.d.ts): its contract, and its docs/ files.
        { find: /^@remy-docs-app\/contract$/, replacement: contract },
        { find: /^@remy-docs-app\//, replacement: app },
      ],
    },
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
  });
}
