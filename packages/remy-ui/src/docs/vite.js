import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The plugins are lazyPlugins (Vite Plus's guide/troubleshooting.md): imported and built only when Vite runs.
import { defineConfig, lazyPlugins } from 'vite-plus';
import { docsTableOf } from './docs/table-core.js';
import { remarkUiWords } from './remark-ui-words.js';
import { remyBuild } from '../build-vite.js';

// An app's whole docs Worker from its docs.config.ts (issue #34, group 2): its docs/vite.config.ts
// is `export default remyDocs(docsConfig, { contract: '<its contract package>' })`. The Worker itself is this
// package's src/docs (Fumadocs' TanStack Start template, on Cloudflare's Vite plugin instead of Nitro); the
// app keeps content/, docs.config.ts, collections.ts (Fumadocs' collections, compiled by fumadocs-mdx's macro,
// which never compiles node_modules) and its Worker's wrangler.jsonc (name, bindings, the package's server as main).
// Nothing is written when this configuration loads.

const packageDocs = fileURLToPath(new URL('.', import.meta.url));

/** The docs package's folder from its repository's root (the nearest folder above it with a .git): docs, apps/remy-auth-docs. */
function repositoryFolder(root) {
  for (let dir = resolve(root); dir !== dirname(dir); dir = dirname(dir))
    if (existsSync(join(dir, '.git'))) return relative(dir, resolve(root)) || '.';
  return 'docs';
}

/**
 * What Ask AI's index holds, worked out when the build starts, because only the build sees which translation files
 * exist: each page in each of its languages as [the bucket's key, the page's Markdown path]. The Worker writes them to
 * its bucket itself after each new version (publish.server.ts). Nothing without docsConfig.ask.
 */
function askObjects(docsConfig, root) {
  if (!docsConfig.ask) return [];
  const json = (file) => JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
  const folder = repositoryFolder(root);
  const repositoryRoot = resolve(root, relative(folder, '.') || '.');
  const table = docsTableOf(
    {
      users: { meta: json('users/meta.json'), i18n: json('users/i18n.json') },
      dev: { meta: json('dev/meta.json'), i18n: json('dev/i18n.json') },
    },
    docsConfig,
    folder,
  );
  return table.docsTable.flatMap((row) =>
    table
      .docsLangs(row, (file) => existsSync(join(repositoryRoot, file)))
      .map((lang) => [
        table.docsObjectKey(row.site, row.slug, lang),
        `${table.docsUrl(row.site, row.slug || 'index', lang)}.md`,
      ]),
  );
}

/**
 * The docs Worker's Vite configuration for the app whose docs/ it runs in, from its docs.config.ts (`contract`: the
 * package of its oRPC contract, which /reference documents). `app`: the folder of the app whose strings the pages
 * name (:ui[key]), its docs/ folder's parent unless given (remy-auth: ../remy-auth). Vite's configuration only: the
 * docs' tasks are their own vite.config.ts's, written out there.
 */
export function remyDocs(docsConfig, { root = process.cwd(), app: appRoot = resolve(root, '..') } = {}) {
  const { contract } = docsConfig;
  // An app without an API has no reference: no /reference, tab, llms entry or MCP server (__REMY_DOCS_API__).
  const api = Boolean(contract);
  const app = root.endsWith('/') ? root : `${root}/`;
  const srcDirectory = relative(root, packageDocs).replace(/\/$/, '');
  return defineConfig({
    plugins: lazyPlugins(async () => {
      const [
        { cloudflare },
        { default: tailwindcss },
        { tanstackStart },
        { default: viteReact },
        { fumadocsMdx },
        { default: remarkDirective },
        { remarkAutoTypeTable },
        { remarkDirectiveAdmonition, remarkMdxMermaid, remarkSteps },
      ] = await Promise.all([
        import('@cloudflare/vite-plugin'),
        import('@tailwindcss/vite'),
        import('@tanstack/react-start/plugin/vite'),
        import('@vitejs/plugin-react'),
        import('fumadocs-mdx/vite'),
        import('remark-directive'),
        import('fumadocs-typescript'),
        import('fumadocs-core/mdx-plugins'),
      ]);
      return [
        // What this build is (`virtual:remy-build`): the docs Worker's /healthz answers with it, as an app's does.
        remyBuild({ root }),
        // Cloudflare's static-asset headers, the same for every app's docs: Vite names these files by their
        // content hash, so they never change; browsers may keep them for a year without asking again.
        {
          name: 'remy-docs-headers',
          generateBundle() {
            if (this.environment?.name !== 'client') return;
            this.emitFile({
              type: 'asset',
              fileName: '_headers',
              source: '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n',
            });
          },
        },
        // Fumadocs MDX compiles content/ for the collections (the app's collections.ts); before Start's plugin.
        // Beyond its defaults (GFM, heading ids, images, code and npm tabs): the app's own words (:ui[key], from its
        // Paraglide catalog: remark-ui-words.js), callouts (:::note), Mermaid
        // (```mermaid), type tables from TypeScript (<auto-type-table>) and steps. GitHub's "default" code
        // themes keep 4.5:1 comment contrast on both backgrounds, which Lighthouse's accessibility audit requires.
        fumadocsMdx({
          macro: { include: [join(root, 'collections.ts')] },
          globalOptions: {
            mdxOptions: {
              remarkPlugins: (plugins) => [
                remarkDirective,
                remarkUiWords({ root: appRoot }),
                remarkDirectiveAdmonition,
                remarkMdxMermaid,
                remarkAutoTypeTable,
                ...plugins,
                remarkSteps,
              ],
              rehypeCodeOptions: { themes: { light: 'github-light-default', dark: 'github-dark-default' } },
              // Pictures and videos live in public/media and are referenced by URL (Fumadocs' stock option), so the
              // Markdown that llms.txt, the .md pages and MCP serve keeps their real addresses.
              remarkImageOptions: { useImport: false, publicDir: 'public' },
            },
          },
        }),
        cloudflare({ viteEnvironment: { name: 'ssr' }, configPath: join(root, 'wrangler.jsonc') }),
        tailwindcss(),
        tanstackStart({ srcDirectory, server: { build: { inlineCss: true } } }),
        viteReact(),
      ];
    }),
    resolve: {
      alias: [
        // The app's own modules the Worker imports (app-modules.d.ts): its contract, and its docs/ files.
        // The contract as the docs app installed it (its own dependency), resolved from its folder.
        {
          find: /^@remy-docs-app\/contract$/,
          replacement: contract
            ? createRequire(join(root, 'package.json')).resolve(contract)
            : join(packageDocs, 'empty-contract.ts'),
        },
        { find: /^@remy-docs-app\//, replacement: app },
      ],
    },
    define: {
      __REMY_DOCS_API__: JSON.stringify(api),
      __REMY_DOCS_FOLDER__: JSON.stringify(repositoryFolder(root)),
      __REMY_DOCS_ASK_OBJECTS__: JSON.stringify(askObjects(docsConfig, root)),
    },
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
  });
}
