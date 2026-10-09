// For an app's checks of a page built with <Allowed> (./allowed.tsx): what the page offers, to compare
// with what the server allows. Plain JavaScript, like ./checks.js.

/** The actions offered inside `locator` (a row, a card, a page), sorted: the `data-action` of every <Allowed> that rendered. */
export async function offeredActions(locator) {
  const actions = await locator.locator('[data-action]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-action')));
  return [...new Set(actions)].sort();
}

/** The actions a `can` map allows, sorted, optionally only those among `offered` (the ones the page has a control for). */
export function allowedActions(can, offered) {
  return Object.keys(can).filter(action => can[action] && (!offered || offered.includes(action))).sort();
}
