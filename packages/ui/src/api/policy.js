// What a contract procedure declares for the guard (./guard-core.js), as oRPC metadata:
// `oc.meta(policy('session')).meta(personal('the caller\'s own account'))`. Plain JavaScript, so a
// contract and the checks that load it in Node share it.
import { defineMeta } from '@orpc/contract';

/** Who may call the procedure: `policy('public')`, `policy('session')` or an action (`actions`). The guard enforces it. */
export const [policy] = defineMeta('policy', who => who);

/** Who receives a response that names a person (an email address, say), in a sentence; `guardProblems` asks for it. */
export const [personal] = defineMeta('personal', whoReceives => whoReceives);

/**
 * The policies an app's vocabulary allows: `const may = actions(vocabulary)`, then
 * `oc.meta(may('EDIT_NOTE'))`. Only an action the vocabulary defines type-checks. The object is the
 * one whose id the input's `id` holds; `{ id: 'noteId' }` names another field.
 */
export const actions = () => (action, options = {}) => policy({ action, ...options });
