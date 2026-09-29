import type { m } from './paraglide/messages.js';
type MessageKey = keyof typeof m;
export declare function problemChecks(options?: {
  failingNavigation?: { from: string; link: MessageKey; fail: string; heading: MessageKey };
  serverRoutes?: { path: string; type: string; cache: string; origin?: boolean }[];
}): void;
