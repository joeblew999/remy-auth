import { seededPeople, type SeededPerson } from '../auth/seed';

// The notes demo's seed: a few notes between the seeded people (src/auth/seed.ts), so that signing in
// as each of them shows a different relation to the same note. It names people by their stable IDs,
// which is all an app's seed ever knows of them. No Workers imports: the checks read this in Node.

type PersonId = SeededPerson['id'];

export const seededNotes = [
  { id: 'note_squad', authorId: 'person_ben', title: 'Squad list for Saturday', body: 'Meet at the gym at 6 pm. Bring both kits.', shares: [{ personId: 'person_cleo', role: 'editor' }, { personId: 'person_dev', role: 'reader' }] },
  { id: 'note_camp', authorId: 'person_cleo', title: 'Ideas for the summer camp', body: 'Two courts, mornings only.', shares: [] },
] as const satisfies readonly { id: string; authorId: PersonId; title: string; body: string; shares: readonly { personId: PersonId; role: 'reader' | 'editor' }[] }[];

const at = '2026-01-01T00:00:00.000Z';
const emailOf = (id: PersonId) => seededPeople.find(person => person.id === id)!.email;

/** The seeded notes and shares, made to exist. One that is already there is left as it is, edits and all. */
export async function ensureSeededNotes(db: D1Database): Promise<void> {
  await db.batch(seededNotes.flatMap(note => [
    db.prepare('insert or ignore into "note" ("id", "author_id", "title", "body", "created_at", "updated_at") values (?, ?, ?, ?, ?, ?)').bind(note.id, note.authorId, note.title, note.body, at, at),
    ...note.shares.map(share => db.prepare('insert or ignore into "note_share" ("note_id", "email", "user_id", "role", "created_at") values (?, ?, ?, ?, ?)').bind(note.id, emailOf(share.personId), share.personId, share.role, at)),
  ]));
}
