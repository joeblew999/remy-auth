import { notesVocabulary, type Note, type NoteList } from '@joeblew999/remy-auth-contract/notes';
import { MAX_IN, relationEngine } from '@joeblew999/remy-ui/api/relations';

// The notes demo's data, in the showcase's own D1 (DEMO_DB), and the relation engine over it. Nothing
// here decides who may do what: the guard asked the engine before a handler ran, and the engine reads
// these tables. A person is an account ID, and for a share not yet taken up, the address it was made to.
// No Workers imports, so the checks load the router that uses this in Node.

/** The signed-in person, as far as notes need to know them. */
type Person = { id: string; email: string; emailVerified: boolean };
type Row = { id: string; author_id: string; title: string; body: string; updated_at: string };

const marks = (values: readonly unknown[]) => values.map(() => '?').join(', ');

export function notesStore(db: D1Database) {
  const relations = relationEngine(notesVocabulary, db);
  const now = () => new Date().toISOString();

  /** Rows by id, a statement's worth of ids at a time. */
  async function inBatches<T>(ids: readonly string[], sql: (batch: readonly string[]) => string): Promise<T[]> {
    const found: T[] = [];
    for (let index = 0; index < ids.length; index += MAX_IN) {
      const batch = ids.slice(index, index + MAX_IN);
      found.push(...(await db.prepare(sql(batch)).bind(...batch).all<T>()).results);
    }
    return found;
  }

  /** Rows as their viewer sees them: each with what the engine says this person may do to it. */
  async function seenBy(person: Person, rows: readonly Row[]): Promise<Note[]> {
    const ids = rows.map(row => row.id);
    const [can, shares] = await Promise.all([
      relations.canFor('NOTE', person, ids),
      inBatches<{ note_id: string; shares: number }>(ids, batch => `select "note_id", count(*) as "shares" from "note_share" where "note_id" in (${marks(batch)}) group by "note_id"`),
    ]);
    const sharedWith = new Map(shares.map(row => [row.note_id, row.shares]));
    return rows.map(row => {
      const mine = row.author_id === person.id;
      // How many people a note is shared with is its author's to know.
      return { id: row.id, title: row.title, body: row.body, mine, sharedWith: mine ? sharedWith.get(row.id) ?? 0 : 0, updatedAt: row.updated_at, can: can.get(row.id)! };
    });
  }

  const one = async (person: Person, id: string) =>
    (await seenBy(person, (await db.prepare('select "id", "author_id", "title", "body", "updated_at" from "note" where "id" = ?').bind(id).all<Row>()).results))[0]!;

  return {
    /** The engine the guard asks (GuardContext's `relations`). */
    relations,

    /** The person's notes: the ones they hold a relation to that lets them view, newest first. */
    async list(person: Person): Promise<NoteList> {
      // A share made to this person's address before they signed in becomes theirs now: the sign-in
      // code proved the address is. Until then it was an address, not a relation.
      if (person.emailVerified) await db.prepare('update "note_share" set "user_id" = ? where "email" = ? and "user_id" is null').bind(person.id, person.email.toLowerCase()).run();
      const held = await Promise.all(notesVocabulary.grants.VIEW_NOTE.map(grant => relations.objectsHeldBy(grant.relation, person.id)));
      const ids = [...new Set(held.flat())];
      const rows = await inBatches<Row>(ids, batch => `select "id", "author_id", "title", "body", "updated_at" from "note" where "id" in (${marks(batch)})`);
      rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return { notes: await seenBy(person, rows), can: { CREATE_NOTE: await relations.can('CREATE_NOTE', person, null) } };
    },

    async create(person: Person, draft: { title: string; body: string }): Promise<Note> {
      const id = crypto.randomUUID();
      const at = now();
      await db.prepare('insert into "note" ("id", "author_id", "title", "body", "created_at", "updated_at") values (?, ?, ?, ?, ?, ?)').bind(id, person.id, draft.title, draft.body, at, at).run();
      return one(person, id);
    },

    async update(person: Person, edit: { id: string; title: string; body: string }): Promise<Note> {
      await db.prepare('update "note" set "title" = ?, "body" = ?, "updated_at" = ? where "id" = ?').bind(edit.title, edit.body, now(), edit.id).run();
      return one(person, edit.id);
    },

    /** Share with an address, or change the role it was shared in. The author's own address is not a share. */
    async share(person: Person, share: { id: string; email: string; role: string }): Promise<Note> {
      const email = share.email.toLowerCase();
      if (email !== person.email.toLowerCase()) {
        await db.prepare('insert into "note_share" ("note_id", "email", "role", "created_at") values (?, ?, ?, ?) on conflict ("note_id", "email") do update set "role" = excluded."role"').bind(share.id, email, share.role, now()).run();
      }
      return one(person, share.id);
    },

    async remove(id: string): Promise<void> {
      await db.batch([db.prepare('delete from "note_share" where "note_id" = ?').bind(id), db.prepare('delete from "note" where "id" = ?').bind(id)]);
    },
  };
}

export type NotesStore = ReturnType<typeof notesStore>;
