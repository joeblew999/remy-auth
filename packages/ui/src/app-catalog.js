// An app's own Paraglide catalog (.plans/thin-apps.md, group 6): its strings in project.inlang at its root,
// messages/<locale>.json, compiled into src/paraglide (gitignored). One home for the compiler options: the app
// preset's Vite plugin and project:generate (`node node_modules/@joeblew999/remy-ui/src/app-catalog.js`) use
// them. The runtime decides nothing itself: the app calls followLocale(runtime) (locale.ts) once, so its
// messages are in the language the platform chose for the request.
import { compile } from '@inlang/paraglide-js';
import { fileURLToPath } from 'node:url';

export const appCatalog = {
  project: './project.inlang',
  outdir: './src/paraglide',
  emitTsDeclarations: true,
  emitGitIgnore: false,
  strategy: ['baseLocale'],
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await compile(appCatalog);
