// An app's Vite configuration (issue #34, group 5): its vite.config.ts is
// `export default defineConfig({ ...remyApp(), run: { tasks } })`, with its own extra plugins, TanStack Start options or port.
// Vite's configuration only: the app's tasks are its own vite.config.ts's, written out there.
// TanStack Start on Cloudflare's Vite plugin, per Cloudflare's and Paraglide's guides: the Worker entry is
// wrangler.jsonc's main (src/server.ts), and the Start plugin comes before React's. Start's defaults carry
// two rows its checks prove: its router plugin splits each route's component into its own chunk (autoCodeSplitting;
// code-splitting.checks.js), and its import protection fails the production build when browser code imports
// a *.server.ts file or @tanstack/react-start/server (build-boundaries.checks.js scans what ships).
// The plugins are lazyPlugins (Vite Plus's guide/troubleshooting.md): imported and built only when Vite runs (dev,
// build, test, preview), not each time Vite Plus reads the configuration for lint, fmt, check, staged or a task lookup.
import { defineConfig, lazyPlugins } from 'vite-plus';
import type { PluginOption, UserConfig } from 'vite-plus';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { remyParts } from './parts/vite.ts';
import { remyBuild } from './build-vite.ts';
import type { BuildOptions } from './build-vite.ts';
import { appCatalog } from './app-catalog.ts';

/**
 * The app's Vite configuration. `plugins`: the app's own, after TanStack Devtools (which must come first)
 * and before the shared ones; `start`: more TanStack Start options (e.g. `prerender`), merged over the
 * shared ones; `cloudflare`: more Cloudflare Vite plugin options; `port`: the dev server's; `build`:
 * the build stamp's options (`packages`: more packages whose versions it lists).
 */
export function remyApp({
  plugins = [],
  start = {},
  cloudflare: cloudflareOptions = {},
  port = 5173,
  root = process.cwd(),
  build = {},
}: {
  /** The app's own Vite plugins, after TanStack Devtools and before the shared ones. */
  plugins?: PluginOption[];
  /** More TanStack Start options (e.g. `prerender`), merged over the shared ones. */
  start?: Record<string, any>;
  /** More Cloudflare Vite plugin options. */
  cloudflare?: Record<string, any>;
  /** The dev server's port (default 5173). */
  port?: number;
  /** The app's root (default the working directory). */
  root?: string;
  /** The build stamp's options: `packages` names more packages whose installed versions it lists. */
  build?: Omit<BuildOptions, 'root'>;
} = {}): UserConfig {
  return defineConfig({
    plugins: lazyPlugins(async () => {
      // Under Vite Plus's test runner (vp test sets VITEST) the app's plugins stay out: the plain-function checks run
      // in Node, and Cloudflare's plugin would move them into the Workers runtime.
      if (process.env.VITEST) return [];
      const [
        { cloudflare },
        { devtools },
        { default: tailwindcss },
        { tanstackStart },
        { default: viteReact },
        { FontaineTransform },
        { paraglideVitePlugin },
      ] = await Promise.all([
        import('@cloudflare/vite-plugin'),
        import('@tanstack/devtools-vite'),
        import('@tailwindcss/vite'),
        import('@tanstack/react-start/plugin/vite'),
        import('@vitejs/plugin-react'),
        import('fontaine'),
        import('@inlang/paraglide-js'),
      ]);
      // The shared package's parts the app lists in src/parts.json (plan: https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/parts.md): their routes and the
      // package's own (the CSP report endpoint) mount beside src/routes, and `virtual:remy-parts` says which.
      const parts = remyParts({ root });
      // The app's own strings, when it has them (project.inlang at its root): compiled into src/paraglide, whose
      // runtime follows the platform's language (followLocale in the app's config).
      const catalog = existsSync(resolve(root, appCatalog.project)) ? [paraglideVitePlugin(appCatalog)] : [];
      return [
        // TanStack Devtools: first, as its docs require; strips the devtools from production builds.
        devtools(),
        ...plugins,
        ...catalog,
        parts.plugin,
        // What this build is (`virtual:remy-build`): /healthz answers with it and the page carries it.
        remyBuild({ root, ...build }),
        cloudflare({ viteEnvironment: { name: 'ssr' }, ...cloudflareOptions }),
        // Fallback faces sized to the web fonts (size-adjust and ascent/descent overrides), so the swap to
        // Geist keeps the layout and LCP; fonts.css lists them. Before Tailwind.
        FontaineTransform.vite({ fallbacks: { 'Geist Variable': ['Arial'] } }),
        tailwindcss(),
        // The stylesheet inlined in the HTML, so the first paint needs no CSS fetch.
        tanstackStart({
          ...start,
          server: { build: { inlineCss: true }, ...start.server },
          router: { virtualRouteConfig: parts.routes, ...start.router },
        }),
        viteReact(),
      ];
    }),
    server: { host: '127.0.0.1', port, strictPort: true },
  });
}
