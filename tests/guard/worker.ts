import * as contract2 from '@orpc/contract';
import * as server2 from '@orpc/server';
import { RPCHandler as RPCHandler2 } from '@orpc/server/fetch';
import { z } from 'zod';
import { guardMiddleware, guardProblems } from '@joeblew999/remy-ui/api/guard-core';
import { contract as contract1, RPCHandler as RPCHandler1, server as server1 } from './v1/orpc';

// The guard (packages/ui/src/api/guard-core.js) on both oRPC majors, in the Workers runtime: one Worker
// holding the app's oRPC 2 and oRPC 1.15.4 (./v1, installed there alone) side by side, each with the
// same small router behind the same guard code. tests/guard.spec.ts starts it and reads what each
// major did. Only the lines marked "major" differ: how a policy is written into a procedure's meta.

type User = { id: string; email: string };
type Context = { getSession: () => Promise<{ user: User } | null>; relations?: typeof relations };
const person: User = { id: 'user-1', email: 'ada@example.test' };
const other: User = { id: 'user-2', email: 'bob@example.test' };

// What the guard asks of a relation engine, answered from two facts: note n1 exists and ada wrote it.
// (The engine itself is checked on a real D1 by tests/relations.spec.ts.)
const vocabulary = {
  objectTypes: [{ code: 'NOTE', tableName: 'note' }, { code: 'PLATFORM' }],
  relations: [{ code: 'AUTHOR', objectTypeCode: 'NOTE', via: 'table' as const, sourceTable: 'note', objectColumn: 'id', userColumn: 'author_id' }, { code: 'ANY_SIGNED_IN', objectTypeCode: 'PLATFORM', via: 'everyone' as const }],
  actions: [{ code: 'EDIT_NOTE', objectTypeCode: 'NOTE' }, { code: 'CREATE_NOTE', objectTypeCode: 'PLATFORM' }],
  grants: { EDIT_NOTE: [{ relation: 'AUTHOR' }], CREATE_NOTE: [{ relation: 'ANY_SIGNED_IN' }] },
};
const relations = {
  can: async (action: string, user: User, objectId: string | null) => (action === 'CREATE_NOTE' ? objectId === null : objectId === 'n1' && user.id === person.id),
  objectTableFor: (action: string) => (action === 'EDIT_NOTE' ? 'note' : null),
  objectExists: async (_table: string, id: string) => id === 'n1',
};

/** One major's router, and how often its handlers and session lookup ran. */
function build(major: 1 | 2) {
  const orpc: any = major === 1 ? server1 : server2;
  // major: 1 takes a plain object in .meta(); 2 takes what defineMeta makes.
  const [policyMeta] = major === 2 ? orpc.defineMeta('policy', (policy: unknown) => policy) : [];
  const [personalMeta] = major === 2 ? orpc.defineMeta('personal', (personal: string) => personal) : [];
  const declared = (builder: any, policy: unknown, personal?: string) => major === 1
    ? builder.meta({ policy, ...(personal ? { personal } : {}) })
    : (personal ? builder.meta(policyMeta(policy)).meta(personalMeta(personal)) : builder.meta(policyMeta(policy)));
  const base = major === 1 ? orpc.os.$context().$meta({}) : orpc.os.$context();
  const guarded = base.use(guardMiddleware({ ORPCError: orpc.ORPCError }));

  const ran = { open: 0, whoami: 0, echo: 0, forgotten: 0, edit: 0, create: 0 };
  const router = {
    open: declared(guarded, 'public').output(z.object({ ok: z.boolean() })).handler(() => { ran.open++; return { ok: true }; }),
    whoami: declared(guarded, 'session', 'the caller\'s own address').output(z.object({ email: z.string() }))
      .handler(({ context }: any) => { ran.whoami++; return { email: context.user.email }; }),
    echo: declared(guarded, 'session').input(z.object({ text: z.string() })).output(z.object({ text: z.string() }))
      .handler(({ input }: any) => { ran.echo++; return input; }),
    // Somebody forgot: no policy at all.
    forgotten: guarded.output(z.object({ ok: z.boolean() })).handler(() => { ran.forgotten++; return { ok: true }; }),
    // The relation engine decides: an action on an object, one on no object yet, and one whose id is in another field.
    edit: declared(guarded, { action: 'EDIT_NOTE' }).input(z.object({ id: z.string(), title: z.string() })).output(z.object({ id: z.string() }))
      .handler(({ input }: any) => { ran.edit++; return { id: input.id }; }),
    create: declared(guarded, { action: 'CREATE_NOTE' }).input(z.object({ title: z.string() })).output(z.object({ ok: z.boolean() }))
      .handler(() => { ran.create++; return { ok: true }; }),
    retitle: declared(guarded, { action: 'EDIT_NOTE', id: 'noteId' }).input(z.object({ noteId: z.string() })).output(z.object({ ok: z.boolean() }))
      .handler(() => ({ ok: true })),
  };
  // What the build-time rule must name: a public answer carrying an address, a personal answer that
  // does not say whose, and a procedure that declares a policy with no guard in front of it.
  const broken = {
    leaky: declared(guarded, 'public').output(z.object({ team: z.string(), coach: z.object({ email: z.string() }) })).handler(() => ({ team: 'U16', coach: { email: person.email } })),
    unexplained: declared(guarded, 'session').output(z.object({ email: z.string() })).handler(() => ({ email: person.email })),
    unguarded: declared(base, 'session').output(z.object({ ok: z.boolean() })).handler(() => ({ ok: true })),
    // An action the vocabulary does not define, and one on an object its input cannot name.
    ghost: declared(guarded, { action: 'PUBLISH_NOTE' }).input(z.object({ id: z.string() })).output(z.object({ ok: z.boolean() })).handler(() => ({ ok: true })),
    blind: declared(guarded, { action: 'EDIT_NOTE' }).input(z.object({ title: z.string() })).output(z.object({ ok: z.boolean() })).handler(() => ({ ok: true })),
  };
  // Contract first, as remy-auth writes its API: the policy is declared on the contract, and the
  // implementation's root middleware is the guard.
  const oc: any = major === 1 ? (contract1.oc as any).$meta({}) : contract2.oc;
  const contract = {
    whoami: declared(oc, 'session', 'the caller\'s own address').output(z.object({ email: z.string() })),
    echo: declared(oc, 'session').input(z.object({ text: z.string() })).output(z.object({ text: z.string() })),
  };
  const api = orpc.implement(contract).$context().use(guardMiddleware({ ORPCError: orpc.ORPCError }));
  const implemented = api.router({
    whoami: api.whoami.handler(({ context }: any) => ({ email: context.user.email })),
    echo: api.echo.handler(({ input }: any) => { ran.echo++; return input; }),
  });
  return { orpc, router, broken, contract, implemented, ran, Handler: major === 1 ? RPCHandler1 : RPCHandler2 as any };
}

async function exercise(major: 1 | 2, origin: string) {
  const { orpc, router, broken, contract, implemented, ran, Handler } = build(major);
  let lookups = 0;
  const context = (user: User | null, engine: typeof relations | null = relations): Context => ({ getSession: async () => { lookups++; return user ? { user } : null; }, relations: engine ?? undefined });
  const outcome = async (run: () => Promise<unknown>) => run().then(value => ({ value }), (error: any) => ({ code: error?.code ?? String(error) }));

  // In process, as a server loader calls it.
  const as = (user: User | null) => orpc.createRouterClient(router, { context: context(user) });
  const inProcess = {
    openAnonymous: await outcome(() => as(null).open()),
    lookupsForOpen: lookups,
    whoamiAnonymous: await outcome(() => as(null).whoami()),
    whoamiSignedIn: await outcome(() => as(person).whoami()),
    echoAnonymousBadInput: await outcome(() => as(null).echo({ text: 42 })),
    forgottenSignedIn: await outcome(() => as(person).forgotten()),
  };

  // The relation engine decides, in the order that tells a stranger nothing.
  const actions = {
    editAnonymous: await outcome(() => as(null).edit({ id: 'n1', title: 'x' })),
    editByAuthor: await outcome(() => as(person).edit({ id: 'n1', title: 'x' })),
    editByAnother: await outcome(() => as(other).edit({ id: 'n1', title: 'x' })),
    editMissingByAuthor: await outcome(() => as(person).edit({ id: 'n9', title: 'x' })),
    editMissingByAnother: await outcome(() => as(other).edit({ id: 'n9', title: 'x' })),
    editWithAnIdThatIsNoString: await outcome(() => as(person).edit({ id: { $ne: null }, title: 'x' })),
    createByAnyone: await outcome(() => as(other).create({ title: 'x' })),
    retitleByAuthor: await outcome(() => as(person).retitle({ noteId: 'n1' })),
    retitleByAnother: await outcome(() => as(other).retitle({ noteId: 'n1' })),
    editWithNoEngine: await outcome(() => orpc.createRouterClient(router, { context: context(person, null) }).edit({ id: 'n1', title: 'x' })),
  };

  // Over HTTP, through the major's own fetch handler.
  const handler = new Handler(router);
  const post = async (name: string, user: User | null) => {
    const request = new Request(`${origin}/rpc/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const { response } = await handler.handle(request, { prefix: '/rpc', context: context(user) });
    return { status: response?.status ?? 0, body: (await response?.text())?.slice(0, 200) };
  };
  const http = {
    openAnonymous: await post('open', null),
    whoamiAnonymous: await post('whoami', null),
    whoamiSignedIn: await post('whoami', person),
    forgottenSignedIn: await post('forgotten', person),
  };
  const implementedAs = (user: User | null) => orpc.createRouterClient(implemented, { context: context(user) });
  const contractFirst = {
    whoamiAnonymous: await outcome(() => implementedAs(null).whoami()),
    whoamiSignedIn: await outcome(() => implementedAs(person).whoami()),
    echoAnonymousBadInput: await outcome(() => implementedAs(null).echo({ text: 42 })),
    contractProblems: guardProblems(contract),
    problems: guardProblems(implemented),
  };
  return {
    inProcess, http, contractFirst, actions, ran,
    problems: guardProblems(router, { vocabulary }),
    brokenProblems: guardProblems(broken, { vocabulary }),
    withoutVocabulary: guardProblems({ edit: router.edit }),
  };
}

export default {
  async fetch(request: Request) {
    const { origin } = new URL(request.url);
    return Response.json({ v1: await exercise(1, origin), v2: await exercise(2, origin) });
  },
} satisfies ExportedHandler;
