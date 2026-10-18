// An app's own Paraglide catalog (issue #34, group 6): its strings in project.inlang at its root,
// messages/<locale>.json, compiled into src/paraglide (gitignored) by the app preset's Vite plugin (app-vite.ts) with
// these options, and by the blank app's generate task (Paraglide's own `paraglide-js compile`, the same options as flags). The runtime decides nothing itself: the app calls followLocale(runtime) (locale.ts) once, so its
// messages are in the language the platform chose for the request.
export const appCatalog: {
  project: string;
  outdir: string;
  emitTsDeclarations: boolean;
  emitGitIgnore: boolean;
  strategy: ['baseLocale'];
} = {
  project: './project.inlang',
  outdir: './src/paraglide',
  emitTsDeclarations: true,
  emitGitIgnore: false,
  strategy: ['baseLocale'],
};
