import { env } from 'cloudflare:workers';
import { notesVocabulary } from '@joeblew999/remy-auth-contract/notes';
import { ensureSeededNotes } from '../notes/seed';
import { notesStore } from '../notes/store';
import { ensureSeededPeople } from './auth.server';
import { fixedSignInCode, permits } from './environment';
import { seededPeople } from './seed';

/** A seeded person as the sign-in form offers them: who they are, and what they hold. */
export type OfferedPerson = { name: string; email: string; role: string; holds: string[] };
/** The seeded sign-in an environment offers: its people and the published code they sign in with. */
export type SeededSignIn = { code: string; people: OfferedPerson[] };

/**
 * The seeded people this environment offers to sign in as, or null where it offers none (any
 * deployment). Asking makes them exist, with the notes demo's seed, so a fresh local database needs
 * no step of its own. What each one holds is read from the data through the relation engine, not
 * written here: the relations they hold on the demo's notes, which is what makes one account
 * different from another of the same role. The administrator is offered only where the table says so.
 */
export async function seededSignIn(request: Request): Promise<SeededSignIn | null> {
  const code = fixedSignInCode(env);
  if (!permits(env, 'seededSignIn') || !code) return null;
  await ensureSeededPeople(request);
  await ensureSeededNotes(env.DEMO_DB);
  const { relations } = notesStore(env.DEMO_DB);
  const onObjects = notesVocabulary.relations.filter(relation => relation.via === 'table');
  const offered = seededPeople.filter(person => person.role !== 'admin' || permits(env, 'offersAdminSignIn'));
  return {
    code,
    people: await Promise.all(offered.map(async ({ id, name, email, role }) => {
      const held = await Promise.all(onObjects.map(async relation => (await relations.objectsHeldBy(relation.code, id)).sort().map(object => `${relation.code} ${object}`)));
      return { name, email, role, holds: held.flat() };
    })),
  };
}
