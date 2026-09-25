import { cloudflare } from '@cloudflare/vite-plugin';
import { devtools } from '@tanstack/devtools-vite';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { FontaineTransform } from 'fontaine';
import { options as paraglide } from './packages/ui/paraglide.mjs';

// TanStack Start on Cloudflare's Vite plugin, per Cloudflare's and Paraglide's guides: the Worker
// entry is wrangler.jsonc's main (src/server.ts), and the Start plugin comes before React's.
// Start's defaults carry two showcase rows: its router plugin always splits each route's
// component into its own chunk (autoCodeSplitting; code-splitting.checks.js), and its import
// protection fails the production build when browser code imports a *.server.ts file or
// @tanstack/react-start/server (build-boundaries.checks.js scans what ships).
export default defineConfig({
  plugins: [
    // TanStack Devtools: first, as its docs require; strips the devtools from production builds.
    devtools(),
    paraglideVitePlugin(paraglide),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    // Fallback faces sized to the web fonts (size-adjust and ascent/descent overrides, as Next.js
    // generates), so the swap to Geist keeps the layout and LCP; fonts.css lists them. Before Tailwind.
    FontaineTransform.vite({ fallbacks: { 'Geist Variable': ['Arial'] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
