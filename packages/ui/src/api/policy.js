// What a contract procedure declares for the guard (./guard-core.js), as oRPC metadata:
// `oc.meta(policy('session')).meta(personal('the caller\'s own account'))`. Plain JavaScript, so a
// contract and the checks that load it in Node share it.
import { defineMeta } from '@orpc/contract';

/** Who may call the procedure: `policy('public')` or `policy('session')`. The guard enforces it. */
export const [policy] = defineMeta('policy', who => who);

/** Who receives a response that names a person (an email address, say), in a sentence; `guardProblems` asks for it. */
export const [personal] = defineMeta('personal', whoReceives => whoReceives);
