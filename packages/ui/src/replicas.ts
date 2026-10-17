import type { AsyncLocalStorage } from 'node:async_hooks';

// D1 read replication for every Remy app (https://developers.cloudflare.com/d1/best-practices/read-replication/).
// A D1 database has one primary, in one region; with read replication on, Cloudflare keeps copies near
// every visitor, but only a D1 *session* reads from them. Measured on 2026-10-17: a page from Asia waited
// ~280 ms per query on a primary in the eastern US, and ~28 ms for the same query near it.
//
// How it works, once for every app:
// - `replicated(env.DB, 'DB')` is the database an app hands its code and its libraries (Better Auth takes
//   it as it takes the binding). Inside a request it reads and writes through that request's session;
//   outside one (a script, a check in Node) it is the binding itself.
// - `withReplicas` (the shared Worker entry runs it on every request) opens the sessions lazily and, on the
//   way out, sets the `remy-d1` cookie to each session's bookmark, so the visitor's next request reads a copy
//   at least as new as what they last saw: save a note, reload, and it is there.
// - Without a bookmark a session starts 'first-unconstrained': the nearest copy answers.
// Locally there is one copy and the sessions read it; switching replication on is a setting of each
// database on Cloudflare, not of the code.

/** The parts of a D1 session and binding this uses: structural, so this module needs no Workers types. */
type Statement = unknown;
type Session = { prepare(query: string): Statement; batch(statements: Statement[]): Promise<unknown[]>; getBookmark(): string | null };
type Database = {
  prepare(query: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
  withSession(constraintOrBookmark?: string): Session;
};

type Store = { bookmarks: URLSearchParams; sessions: Map<string, Session> };
// Loaded on the first request, never at import: the module that wires the Worker entry (tanstack.tsx) is in
// the browser's bundle too, where node:async_hooks does not exist and broke hydration.
let current: AsyncLocalStorage<Store> | undefined;

/** The cookie carrying each database's bookmark, by binding name. */
export const bookmarkCookie = 'remy-d1';

const standIns = new WeakMap<object, Database>();

/**
 * The database `binding` as this request's D1 session sees it (the binding itself outside a request).
 * `name` keys its bookmark in the cookie: the binding's name. The same stand-in is answered for a binding
 * every time, so a library built once per isolate (Better Auth) keeps one and still reads per request.
 */
export function replicated<D extends object>(binding: D, name: string): D {
  const known = standIns.get(binding);
  if (known) return known as unknown as D;
  const database = binding as unknown as Database;
  const session = (): Database | Session => {
    const store = current?.getStore();
    if (!store) return database;
    let open = store.sessions.get(name);
    if (!open) store.sessions.set(name, open = database.withSession(store.bookmarks.get(name) ?? 'first-unconstrained'));
    return open;
  };
  const standIn: Database = {
    prepare: query => session().prepare(query),
    batch: statements => session().batch(statements),
    // exec runs statements as written (migrations, never a request's reads): the primary, as always.
    exec: query => database.exec(query),
    withSession: constraint => database.withSession(constraint),
  };
  standIns.set(binding, standIn);
  return standIn as unknown as D;
}

/** The bookmarks a request carries, by binding name. */
function bookmarksOf(request: Request): URLSearchParams {
  for (const part of request.headers.get('Cookie')?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === bookmarkCookie) {
      try { return new URLSearchParams(decodeURIComponent(value.join('='))); } catch { return new URLSearchParams(); }
    }
  }
  return new URLSearchParams();
}

/**
 * Runs `handle` with this request's D1 sessions, then sets the bookmark cookie when a session moved it.
 * A response streamed after `handle` returns (a server-rendered page) still reads through its sessions;
 * only a bookmark taken after the headers left is not sent, and those are a page's reads, not its writes.
 */
export async function withReplicas(request: Request, handle: () => Promise<Response>): Promise<Response> {
  current ??= new (await import('node:async_hooks')).AsyncLocalStorage<Store>();
  const store: Store = { bookmarks: bookmarksOf(request), sessions: new Map() };
  const response = await current.run(store, handle);
  let moved = false;
  for (const [name, session] of store.sessions) {
    const bookmark = session.getBookmark();
    if (bookmark && bookmark !== store.bookmarks.get(name)) { store.bookmarks.set(name, bookmark); moved = true; }
  }
  if (!moved) return response;
  const out = new Response(response.body, response);
  out.headers.append('Set-Cookie', `${bookmarkCookie}=${encodeURIComponent(store.bookmarks.toString())}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`);
  return out;
}
