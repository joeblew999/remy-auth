// What a contract procedure declares for the guard (./guard-core.js), as oRPC metadata:
// `oc.meta(policy('session')).meta(personal('the caller\'s own account'))`. Packed (vite.config.ts), so a
// contract and the checks that load it in Node share it.
import { defineMeta } from '@orpc/contract';
import type { AnyMetaPlugin } from '@orpc/contract';
import type { Policy } from './guard-core.ts';
import type { ActionCode, Vocabulary } from './relations.ts';

/** Who may call the procedure: `policy('public')`, `policy('session')` or an action (`actions`). The guard enforces it. */
export const [policy]: [(who: Policy) => AnyMetaPlugin, unknown] = defineMeta('policy', (who: Policy) => who);

/** Who receives a response that names a person (an email address, say), in a sentence; `guardProblems` asks for it. */
export const [personal]: [(whoReceives: string) => AnyMetaPlugin, unknown] = defineMeta(
  'personal',
  (whoReceives: string) => whoReceives,
);

/**
 * The policies an app's vocabulary allows: `const may = actions(vocabulary)`, then
 * `oc.meta(may('EDIT_NOTE'))`. Only an action the vocabulary defines type-checks. The object is the
 * one whose id the input's `id` holds; `{ id: 'noteId' }` names another field.
 */
export const actions: <V extends Vocabulary>(
  vocabulary: V,
) => (action: ActionCode<V>, options?: { id?: string }) => AnyMetaPlugin =
  () =>
  (action, options = {}) =>
    policy({ action, ...options });
