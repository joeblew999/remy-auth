// An app's Vite configuration (.plans/thin-apps.md, group 5): its vite.config.ts is
// `export default remyApp()`, with its own extra plugins, TanStack Start options or port when it has any.
// TanStack Start on Cloudflare's Vite plugin, per Cloudflare's and Paraglide's guides: the Worker entry is
// wrangler.jsonc's main (src/server.ts), and the Start plugin comes before React's. Start's defaults carry
// two showcase rows: its router plugin splits each route's component into its own chunk (autoCodeSplitting;
// code-splitting.checks.js), and its import protection fails the production build when browser code imports
// a *.server.ts file or @tanstack/react-start/server (build-boundaries.checks.js scans what ships).
import { cloudflare } from '@cloudflare/vite-plugin';
import { devtools } from '@tanstack/devtools-vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { FontaineTransform } from 'fontaine';
import { remyParts } from './parts/vite.js';

/**
 * The app's Vite configuration. `plugins`: the app's own, after TanStack Devtools (which must come first)
 * and before the shared ones; `start`: more TanStack Start options (e.g. `prerender`), merged over the
 * shared ones; `cloudflare`: more Cloudflare Vite plugin options; `port`: the dev server's.
 */
export function remyApp({ plugins = [], start = {}, cloudflare: cloudflareOptions = {}, port = 5173, root = process.cwd() } = {}) {
  // The shared package's parts the app lists in src/parts.json (.plans/parts.md): their routes and the
  // package's own (the CSP report endpoint) mount beside src/routes, and `virtual:remy-parts` says which.
  const parts = remyParts({ root });
  return defineConfig({
    plugins: [
      // TanStack Devtools: first, as its docs require; strips the devtools from production builds.
      devtools(),
      ...plugins,
      parts.plugin,
      cloudflare({ viteEnvironment: { name: 'ssr' }, ...cloudflareOptions }),
      // Fallback faces sized to the web fonts (size-adjust and ascent/descent overrides), so the swap to
      // Geist keeps the layout and LCP; fonts.css lists them. Before Tailwind.
      FontaineTransform.vite({ fallbacks: { 'Geist Variable': ['Arial'] } }),
      tailwindcss(),
      // The stylesheet inlined in the HTML, so the first paint needs no CSS fetch.
      tanstackStart({ ...start, server: { build: { inlineCss: true }, ...start.server }, router: { virtualRouteConfig: parts.routes, ...start.router } }),
      viteReact(),
    ],
    server: { host: '127.0.0.1', port, strictPort: true },
  });
}
