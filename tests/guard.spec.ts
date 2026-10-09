import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { unstable_startWorker } from 'wrangler';

// The guard (@joeblew999/remy-ui/api/guard-core) on both oRPC majors, in the Workers runtime. remy-auth and
// the platform run the oRPC 2.0 beta; other Remy apps are still on 1.15, whose procedures keep their
// middlewares and output schemas elsewhere, and the guard must hold on both. tests/guard/worker.ts builds
// the same router on each major behind the same guard code, and this starts it with Wrangler and reads
// what happened. oRPC 1 is installed in tests/guard/v1 alone (mise run ui:guard-fixture).
// It touches neither the app nor its database, so it runs the same against any test target.

type Outcome = { value?: unknown; code?: string };
type Major = {
  inProcess: Record<'openAnonymous' | 'whoamiAnonymous' | 'whoamiSignedIn' | 'echoAnonymousBadInput' | 'forgottenSignedIn', Outcome> & { lookupsForOpen: number };
  http: Record<'openAnonymous' | 'whoamiAnonymous' | 'whoamiSignedIn' | 'forgottenSignedIn', { status: number; body: string }>;
  contractFirst: Record<'whoamiAnonymous' | 'whoamiSignedIn' | 'echoAnonymousBadInput', Outcome> & { contractProblems: string[]; problems: string[] };
  actions: Record<string, Outcome>;
  ran: Record<'open' | 'whoami' | 'echo' | 'forgotten' | 'edit' | 'create', number>;
  problems: string[];
  brokenProblems: string[];
  withoutVocabulary: string[];
};

// Read with a fallback: Playwright loads every spec file whatever is selected, so a missing fixture
// (mise run ui:guard-fixture; project:prepare and dev:start run it) fails the guard's own tests below,
// never a smoke run against a deployment.
const version = (folder: string): string => { try { return JSON.parse(readFileSync(`${folder}/package.json`, 'utf8')).version; } catch { return `? (${folder} is not installed: mise run ui:guard-fixture)`; } };
const installed = { v1: version('tests/guard/v1/node_modules/@orpc/server'), v2: version('node_modules/@orpc/server') };
let results: Record<'v1' | 'v2', Major>;

// One fixture Worker for the whole file: in one Playwright worker, in order.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.setTimeout(60_000);
  const worker = await unstable_startWorker({ config: 'tests/guard/wrangler.jsonc', dev: { server: { port: 0 }, inspector: false, watch: false, logLevel: 'error' } });
  try {
    await worker.ready;
    results = await (await worker.fetch('http://guard.test/')).json() as typeof results;
  } finally {
    await worker.dispose();
  }
});

test('the guard is checked against oRPC 1 and oRPC 2', () => {
  expect(installed.v1).toMatch(/^1\./);
  expect(installed.v2).toMatch(/^2\./);
});

for (const major of ['v1', 'v2'] as const) test.describe(`the guard on oRPC ${installed[major]}`, () => {
  test('a public procedure runs for a stranger, and costs no session lookup', () => {
    expect(results[major].inProcess.openAnonymous).toEqual({ value: { ok: true } });
    expect(results[major].inProcess.lookupsForOpen).toBe(0);
    expect(results[major].http.openAnonymous.status).toBe(200);
  });

  test('a procedure that needs a session refuses a stranger and runs for a signed-in person, in process and over HTTP', () => {
    const { inProcess, http, ran } = results[major];
    expect(inProcess.whoamiAnonymous).toEqual({ code: 'UNAUTHORIZED' });
    expect(inProcess.whoamiSignedIn).toEqual({ value: { email: 'ada@example.test' } });
    expect(http.whoamiAnonymous.status).toBe(401);
    expect(http.whoamiAnonymous.body).not.toContain('ada@example.test');
    expect(http.whoamiSignedIn.status).toBe(200);
    expect(http.whoamiSignedIn.body).toContain('ada@example.test');
    // Its handler ran for the two signed-in calls only.
    expect(ran.whoami).toBe(2);
  });

  test('a stranger is refused before the input is even checked', () => {
    expect(results[major].inProcess.echoAnonymousBadInput).toEqual({ code: 'UNAUTHORIZED' });
    expect(results[major].contractFirst.echoAnonymousBadInput).toEqual({ code: 'UNAUTHORIZED' });
    expect(results[major].ran.echo).toBe(0);
  });

  test('a procedure that declares no policy never runs, even for a signed-in person, and the rule names it', () => {
    const { inProcess, http, ran, problems } = results[major];
    expect(inProcess.forgottenSignedIn).toEqual({ code: 'INTERNAL_SERVER_ERROR' });
    expect(http.forgottenSignedIn.status).toBe(500);
    expect(ran.forgotten).toBe(0);
    expect(problems).toEqual(['forgotten: declares no policy (public, session or an action)']);
  });

  test('the rule names a public answer that carries an address, a personal answer that does not say whose, a procedure without the guard, and an action the vocabulary or the input cannot place', () => {
    expect(results[major].brokenProblems).toEqual([
      'leaky: reachable without a session, and its response carries email',
      'unexplained: its response carries email; say who receives them (personal)',
      'unguarded: the guard is not in front of it',
      'ghost: its policy names PUBLISH_NOTE, which the vocabulary does not define',
      'blind: EDIT_NOTE acts on a NOTE, and its input has no "id" to say which',
    ]);
    expect(results[major].withoutVocabulary).toEqual(['edit: its policy is the action EDIT_NOTE, and the check was given no vocabulary to find it in']);
  });

  test('an action is decided by the relation engine: nobody without a session, a missing object before anybody is refused, then the relation', () => {
    expect(results[major].actions).toEqual({
      editAnonymous: { code: 'UNAUTHORIZED' },
      editByAuthor: { value: { id: 'n1' } },
      editByAnother: { code: 'FORBIDDEN' },
      // A missing object is 404 to its author and to anybody else alike: "forbidden" never says which ids are real.
      editMissingByAuthor: { code: 'NOT_FOUND' },
      editMissingByAnother: { code: 'NOT_FOUND' },
      // The guard runs before validation, so only a plain string is ever looked up.
      editWithAnIdThatIsNoString: { code: 'NOT_FOUND' },
      // An action on nothing yet (creating) needs no object.
      createByAnyone: { value: { ok: true } },
      // The id may sit in another input field, when the policy says which.
      retitleByAuthor: { value: { ok: true } },
      retitleByAnother: { code: 'FORBIDDEN' },
      // An action with no engine to ask is refused, never waved through.
      editWithNoEngine: { code: 'INTERNAL_SERVER_ERROR' },
    });
    // The handlers ran for the allowed calls only.
    expect(results[major].ran.edit).toBe(1);
    expect(results[major].ran.create).toBe(1);
  });

  test('contract first: the policy on the contract is the one the implementation enforces', () => {
    const { contractFirst } = results[major];
    expect(contractFirst.whoamiAnonymous).toEqual({ code: 'UNAUTHORIZED' });
    expect(contractFirst.whoamiSignedIn).toEqual({ value: { email: 'ada@example.test' } });
    expect(contractFirst.contractProblems).toEqual([]);
    expect(contractFirst.problems).toEqual([]);
  });
});
