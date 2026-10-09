import type { ReactNode } from 'react';

/**
 * Shows its children only when the server allowed `action` to this viewer on this object. `can` is
 * the map that came with the data (the relation engine's `canFor`, sent with every row), never
 * something the page worked out from who the viewer is: a page that branched on a role would be a
 * second copy of the rules, and remy-sport's screens went unprotected that way. Only an action the
 * row carries type-checks. The wrapper names the action (`data-action`), so a check reads off a page
 * what it offers and compares it with what the server allows (`offeredActions`, ./allowed.checks.js).
 */
export function Allowed<TAction extends string>({ can, action, children }: { can: Readonly<Record<TAction, boolean>>; action: NoInfer<TAction>; children: ReactNode }) {
  return can[action] ? <span data-action={action} className="contents">{children}</span> : null;
}
