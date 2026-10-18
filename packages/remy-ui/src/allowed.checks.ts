// For an app's checks of a page built with <Allowed> (./allowed.tsx): what the page offers, to compare
// with what the server allows.
import type { Locator } from '@playwright/test';

/** The actions offered inside `locator` (a row, a card, a page), sorted: the `data-action` of every <Allowed> that rendered. */
export async function offeredActions(locator: Locator): Promise<string[]> {
  const actions = await locator
    .locator('[data-action]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-action') as string));
  // Code-unit order, as sort() without a compare function orders strings.
  return [...new Set(actions)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The actions a `can` map allows, sorted, optionally only those among `offered` (the ones the page has a control for). */
export function allowedActions(can: Readonly<Record<string, boolean>>, offered?: readonly string[]): string[] {
  return Object.keys(can)
    .filter((action) => can[action] && (!offered || offered.includes(action)))
    .sort();
}
