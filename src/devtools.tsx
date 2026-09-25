import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';

// TanStack Router and Query devtools, in development only. A production build replaces
// import.meta.env.DEV with false, so the bundler drops the dynamic import and no devtools code
// ships: build-boundaries.checks.js scans every script the production Worker serves.
const Panels = import.meta.env.DEV ? lazy(() => import('./devtools-panels')) : undefined;

/** The devtools' floating buttons, mounted in the browser after hydration; nothing in production. */
export function Devtools() {
  return Panels ? <ClientOnly><Suspense><Panels /></Suspense></ClientOnly> : null;
}
