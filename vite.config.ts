import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { remyApp } from '@joeblew999/remy-ui/app/vite';
import { options as paraglide } from './packages/ui/paraglide.mjs';

// remy-auth's app: the shared app configuration (@joeblew999/remy-ui/app/vite), plus the Paraglide compiler
// for the shared catalogs, which this repository owns (packages/ui/messages).
export default remyApp({ plugins: [paraglideVitePlugin(paraglide)] });
