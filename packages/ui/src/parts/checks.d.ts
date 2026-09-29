import type { OneLanguage } from '../checks.js';
import type { m } from '../paraglide/messages.js';
type MessageKey = keyof typeof m;
export declare function partChecks(options?: {
  /** Each listed part's checks' options, by the part's name; another package's parts take theirs (see its README). */
  options?: Record<string, unknown> & {
    'time-zones'?: { known?: string; alias?: string; unknown?: string };
    'deferred-place'?: { path?: string; from?: string; link?: MessageKey; heading?: MessageKey };
    /** Required when the app lists seo-routes: its site pages (the package's and its own) and one-language pages. */
    'seo-routes'?: { paths: string[]; oneLanguage?: OneLanguage };
    /** Required when the app lists status-card: as statusCardChecks (the Worker's name, the page with the card, the status endpoint). */
    'status-card'?: { service: string; path?: string; refreshMs?: number; endpoint?: string };
  };
}): void;
