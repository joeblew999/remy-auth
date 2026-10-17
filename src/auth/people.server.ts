import { env } from 'cloudflare:workers';
import { replicated } from '@joeblew999/remy-ui/replicas';
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

let seeding: Promise<void> | undefined;

/**
 * The seed, made to exist once per Worker instance rather than on every page that offers it: on a
 * preview, whose database is a continent away, seeding on each load made the account page take
 * three seconds (Cloudflare's logs, 2026-10-17). A seed that failed is tried again on the next ask.
 */
function seeded(request: Request): Promise<void> {
  seeding ??= Promise.all([ensureSeededPeople(request), ensureSeededNotes(replicated(env.DEMO_DB, 'DEMO_DB'))]).then(() => undefined, error => {
    seeding = undefined;
    throw error;
  });
  return seeding;
}

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
  await seeded(request);
  const { relations } = notesStore(replicated(env.DEMO_DB, 'DEMO_DB'));
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
