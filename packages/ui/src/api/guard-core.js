// The guard (.plans/auth-service.md): who may call a procedure is the procedure's own `meta.policy`,
// and one root middleware enforces it. Nothing here imports oRPC, so the same code runs on oRPC 1 and
// on 2.0 (the app's oRPC hands in its ORPCError; ./guard.js binds the installed one), and Playwright
// loads the rules in Node. Plain JavaScript, like ./coverage.js.
import { z } from 'zod';

/**
 * The policies. "public": anyone, with no session; what it answers must name no person. "session":
 * only a signed-in person; a session is not a relationship, so what it answers is the caller's own.
 * `{ action }`: a signed-in person who holds a relation the app's vocabulary grants that action to,
 * on the object the input names (`id`: which input field holds its id, "id" unless said). Anything
 * else, and nothing at all, is refused.
 */
export const policies = ['public', 'session'];

/** The action a policy names, when it is one the relation engine decides. */
export const actionOf = policy => (policy && typeof policy === 'object' && typeof policy.action === 'string' && policy.action ? policy.action : undefined);

const known = policy => policies.includes(policy) || Boolean(actionOf(policy));

/**
 * Property names that mark a response as naming a person: Better Auth's own for an account. An app
 * adds its own (`guardProblems`' `personFields`). A line made checkable, not a theory of personal data.
 */
export const personFields = ['email', 'emailVerified', 'image', 'phoneNumber', 'userId'];

const internals = procedure => procedure?.['~orpc'];

/** The policy a procedure (or contract procedure) declares, on oRPC 1 and 2: `meta.policy` (./policy.js writes it on 2). */
export const policyOf = procedure => internals(procedure)?.meta?.policy;

/** A procedure's middlewares, on oRPC 1 (`middlewares`) and 2 (`orderedMiddlewares`, entries holding one). */
export const middlewaresOf = procedure => (internals(procedure)?.middlewares ?? internals(procedure)?.orderedMiddlewares ?? []).map(entry => entry?.middleware ?? entry);

/** A procedure's output schemas, on oRPC 1 (`outputSchema`) and 2 (`outputSchemas`). */
export const outputSchemasOf = procedure => [internals(procedure)?.outputSchema, ...(internals(procedure)?.outputSchemas ?? [])].filter(Boolean);

/** Every procedure in a router or contract, with its dotted path. Reads no oRPC class, so it walks either major. */
export function walk(router, path = []) {
  if (!router || typeof router !== 'object') return [];
  if (internals(router)) return [{ path: path.join('.'), procedure: router }];
  return Object.entries(router).flatMap(([key, child]) => walk(child, [...path, key]));
}

const GUARD = Symbol.for('remy.guard');

/** Marks `middleware` as the guard, so `guardProblems` can see it in front of a procedure. */
export function markGuard(middleware) {
  Object.defineProperty(middleware, GUARD, { value: true, enumerable: false });
  return middleware;
}

/** Whether the guard is among a procedure's middlewares. */
export const isGuarded = procedure => middlewaresOf(procedure).some(middleware => middleware?.[GUARD] === true);

/**
 * The root middleware. `context.getSession()` answers the caller's session or null (the lazy lookup
 * of oRPC's Better Auth guide) and is called only when the policy needs it, so a public read costs none. Public: runs with `user: null`.
 * Session: 401 without one, else runs with `user`. An action: 401 without a session; then the
 * relation engine in `context.relations` decides (remy-sport's requireAction). A platform relation
 * answers before there is an object to look up; otherwise a missing object is 404 before anybody is
 * told 403, so "forbidden" never says which ids are real; then the person needs a relation the action
 * is granted to. No policy, one this guard does not know, or an action with no engine to ask: the
 * handler never runs (500; `guardProblems` fails the build on it first).
 */
export function guardMiddleware({ ORPCError }) {
  return markGuard(async ({ procedure, context, next }, input) => {
    const policy = policyOf(procedure);
    if (policy === 'public') return next({ context: { user: null } });
    const action = actionOf(policy);
    if (policy !== 'session' && !(action && context.relations)) throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'This procedure declares no policy the guard can enforce, so it is refused.' });
    const session = await context.getSession();
    const user = session?.user;
    if (!user) throw new ORPCError('UNAUTHORIZED', { message: 'Sign in to call this.' });
    if (policy === 'session') return next({ context: { user } });

    const { relations } = context;
    if (await relations.can(action, user, null)) return next({ context: { user } });
    const table = relations.objectTableFor(action);
    if (!table) throw new ORPCError('FORBIDDEN', { message: 'You may not do this.' });
    // The guard wraps validation, so the input is as it arrived: only a plain string is an id.
    const objectId = input && typeof input === 'object' ? input[policy.id ?? 'id'] : undefined;
    if (typeof objectId !== 'string' || !objectId || !(await relations.objectExists(table, objectId))) throw new ORPCError('NOT_FOUND', { message: 'There is no such thing here.' });
    if (await relations.can(action, user, objectId)) return next({ context: { user } });
    throw new ORPCError('FORBIDDEN', { message: 'You may not do this.' });
  });
}

/** Every property name a response (or an input) can carry, at any depth, read from its schema (Zod 4's JSON Schema). */
function propertyNames(schema, io = 'output') {
  const names = new Set();
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties' && value && typeof value === 'object') for (const name of Object.keys(value)) names.add(name);
      visit(value);
    }
  };
  visit(z.toJSONSchema(schema, { unrepresentable: 'any', io }));
  return names;
}

/**
 * What is wrong, one sentence per gap; empty when every procedure
 * 1. declares a policy the guard knows;
 * 2. has the guard in front of it (implemented procedures; a contract has no middlewares);
 * 3. names no person in its response when it is reachable without a session;
 * 4. says who receives them (`meta.personal`) when its response does name a person;
 * 5. names an action the app's `vocabulary` defines, when its policy is an action, and takes the
 *    object's id in its input when that action acts on an object.
 * 3 and 4 are remy-sport's lesson: every route there declared a policy, and one still served a squad
 * of minors to strangers, because nothing asked what a response was about.
 */
export function guardProblems(router, { personFields: fields = personFields, vocabulary } = {}) {
  const problems = [];
  for (const { path, procedure } of walk(router)) {
    const { meta = {}, handler, inputSchema, inputSchemas = [] } = internals(procedure);
    const policy = policyOf(procedure);
    if (!known(policy)) problems.push(`${path}: declares no policy (${policies.join(', ')} or an action)`);
    if (handler && !isGuarded(procedure)) problems.push(`${path}: the guard is not in front of it`);
    const action = actionOf(policy);
    if (action) {
      const defined = vocabulary?.actions.find(row => row.code === action);
      if (!vocabulary) problems.push(`${path}: its policy is the action ${action}, and the check was given no vocabulary to find it in`);
      else if (!defined) problems.push(`${path}: its policy names ${action}, which the vocabulary does not define`);
      else if (vocabulary.objectTypes.find(type => type.code === defined.objectTypeCode)?.tableName) {
        const key = policy.id ?? 'id';
        let inputs = new Set();
        try { inputs = new Set([inputSchema, ...inputSchemas].filter(Boolean).flatMap(schema => [...propertyNames(schema, 'input')])); } catch { /* reported with the output below */ }
        if (!inputs.has(key)) problems.push(`${path}: ${action} acts on a ${defined.objectTypeCode}, and its input has no "${key}" to say which`);
      }
    }
    let names;
    try {
      names = new Set(outputSchemasOf(procedure).flatMap(schema => [...propertyNames(schema)]));
    } catch {
      problems.push(`${path}: its output schema cannot be read, so what it answers is unknown`);
      continue;
    }
    const named = fields.filter(field => names.has(field));
    if (named.length === 0) continue;
    if (policy !== 'session' && !action) problems.push(`${path}: reachable without a session, and its response carries ${named.join(', ')}`);
    else if (typeof meta.personal !== 'string' || !meta.personal) problems.push(`${path}: its response carries ${named.join(', ')}; say who receives them (personal)`);
  }
  return problems;
}
