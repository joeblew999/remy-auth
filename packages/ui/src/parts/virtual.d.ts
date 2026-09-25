// The module remyParts() (./vite.js) generates from the app's src/parts.json.
declare module 'virtual:remy-parts' {
  import type { PartName } from '@joeblew999/remy-ui/parts';
  /** The listed parts, in list order. */
  export const parts: readonly PartName[];
  /** Whether the app lists `name`: code that links to another part's routes asks first. */
  export function hasPart(name: PartName): boolean;
}
