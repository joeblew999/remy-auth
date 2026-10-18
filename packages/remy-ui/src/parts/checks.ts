// Every listed part's checks, from one line in an app's test file: partChecks(). Each part's folder has a
// checks.js whose default export runs them (the platform's parts here, another package's in that package), loaded
// for the app's own src/parts.json when this module loads, so partChecks() declares its tests at once.
// A part left out of src/parts.json leaves no check behind.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listedParts } from './list.ts';
import type { OneLanguage } from '../checks.ts';
import type { m } from '@joeblew999/remy-ui/messages';

type MessageKey = keyof typeof m;
/** A part's checks: the default export of its folder's checks.js. */
type PartChecksRun = (options: unknown, listed: ReturnType<typeof listedParts>) => void;

const listed = listedParts();
const checks: Record<string, PartChecksRun> = Object.fromEntries(
  await Promise.all(
    Object.entries(listed).map(async ([name, part]) => [
      name,
      (await import(pathToFileURL(join(part.dir, 'checks.js')).href)).default,
    ]),
  ),
);

/** `options` maps a part's name to its checks' options. */
export function partChecks({
  options = {},
}: {
  /** Each listed part's checks' options, by the part's name; another package's parts take theirs (see its README). */
  options?: Record<string, unknown> & {
    'time-zones'?: { known?: string; alias?: string; unknown?: string };
    'deferred-place'?: { path?: string; from?: string; link?: MessageKey; heading?: MessageKey };
    /** Required when the app lists seo-routes: its site pages (the package's and its own) and one-language pages. */
    'seo-routes'?: { paths: string[]; oneLanguage?: OneLanguage };
    /** Required when the app lists status-card: as statusCardChecks (the Worker's name, the page with the card, the status endpoint). */
    'status-card'?: { service: string; path?: string; refreshMs?: number; endpoint?: string };
  };
} = {}): void {
  for (const [name, run] of Object.entries(checks)) run(options[name], listed);
}
