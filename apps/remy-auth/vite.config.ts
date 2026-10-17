import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { options as paraglide } from '../../packages/ui/paraglide.mjs';

// remy-auth's app: the shared app configuration (@joeblew999/remy-ui/app/vite) with every app's tasks, plus the
// Paraglide compiler for the shared catalogs, which this repository owns (packages/ui/messages). Its folder is this
// file's, never the folder a tool happened to start in (Vite Plus loads every package's config from the root).
export default remyApp({ plugins: [paraglideVitePlugin(paraglide)], root: import.meta.dirname });
