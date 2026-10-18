import { test, expect } from 'vite-plus/test';
import { bookmarkCookie, replicated, withReplicas } from '../../packages/remy-ui/src/replicas';

// D1 read replication (packages/remy-ui/src/replicas.ts): a request reads through a D1 session, which may answer
// from a nearby copy, and the visitor's next request starts from the bookmark this one left, so what they
// saved is what they see. A fake D1 here, since the session and its bookmark are the whole contract.

/** A D1 binding that records how each session was opened, and moves the bookmark on every write. */
function fakeD1() {
  const opened: (string | undefined)[] = [];
  const binding = {
    prepare: (query: string) => ({ via: 'binding', query }),
    batch: async () => [],
    exec: async () => ({}),
    withSession(from?: string) {
      opened.push(from);
      let bookmark: string | null = from === 'first-unconstrained' ? null : (from ?? null);
      return {
        prepare: (query: string) => {
          if (query.startsWith('insert')) bookmark = `after:${query}`;
          return { via: 'session', query };
        },
        batch: async () => [],
        getBookmark: () => bookmark,
      };
    },
  };
  return { binding, opened };
}

const request = (cookie?: string) => new Request('https://app.test/en', cookie ? { headers: { Cookie: cookie } } : {});
const cookieOf = (response: Response) => response.headers.get('Set-Cookie');

test('outside a request the stand-in is the binding; inside one, its session, opened once and nearest first', async () => {
  const { binding, opened } = fakeD1();
  const db = replicated(binding, 'DB');
  expect(replicated(binding, 'DB')).toBe(db);
  expect(db.prepare('select 1')).toEqual({ via: 'binding', query: 'select 1' });
  await withReplicas(request(), async () => {
    expect(db.prepare('select 1')).toEqual({ via: 'session', query: 'select 1' });
    db.prepare('select 2');
    return new Response('ok');
  });
  expect(opened).toEqual(['first-unconstrained']);
});

test('a write sets the bookmark cookie, and the next request opens its session from it', async () => {
  const { binding, opened } = fakeD1();
  const db = replicated(binding, 'DB');
  const read = await withReplicas(request(), async () => {
    db.prepare('select 1');
    return new Response('ok');
  });
  expect(cookieOf(read), 'a read moves no bookmark').toBeNull();

  const wrote = await withReplicas(request(), async () => {
    db.prepare('insert into note');
    return new Response('ok');
  });
  const cookie = cookieOf(wrote)!;
  expect(cookie).toContain(`${bookmarkCookie}=`);
  expect(cookie).toContain('HttpOnly');

  await withReplicas(request(cookie.split(';')[0]), async () => {
    db.prepare('select 1');
    return new Response('ok');
  });
  expect(opened.at(-1)).toBe('after:insert into note');
});

test("each database keeps its own bookmark, and one left untouched keeps the visitor's", async () => {
  const auth = fakeD1();
  const demo = fakeD1();
  const db = replicated(auth.binding, 'DB');
  const demoDb = replicated(demo.binding, 'DEMO_DB');
  const first = await withReplicas(request(), async () => {
    db.prepare('insert into user');
    demoDb.prepare('insert into note');
    return new Response('ok');
  });
  const second = await withReplicas(request(cookieOf(first)!.split(';')[0]), async () => {
    demoDb.prepare('insert into share');
    return new Response('ok');
  });
  const value = new URLSearchParams(
    decodeURIComponent(
      cookieOf(second)!
        .split(';')[0]
        .slice(bookmarkCookie.length + 1),
    ),
  );
  expect(value.get('DB')).toBe('after:insert into user');
  expect(value.get('DEMO_DB')).toBe('after:insert into share');
});
