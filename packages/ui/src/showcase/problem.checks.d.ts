import type { m } from '../paraglide/messages.js';
type MessageKey = keyof typeof m;
export declare function problemChecks(options?: {
  timeZones?: { known: string; alias: string; unknown: string };
  failingNavigation?: { from: string; link: MessageKey; fail: string; heading: MessageKey };
  serverRoutes?: { path: string; type: string; cache: string; origin?: boolean }[];
}): void;
