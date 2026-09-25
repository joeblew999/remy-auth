import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { options as paraglide } from './packages/ui/paraglide.mjs';

// TanStack Start on Cloudflare's Vite plugin, per Cloudflare's and Paraglide's guides: the Worker
// entry is wrangler.jsonc's main (src/server.ts), and the Start plugin comes before React's.
export default defineConfig({
  plugins: [
    paraglideVitePlugin(paraglide),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
