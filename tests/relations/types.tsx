import { notesVocabulary, type Note } from '@joeblew999/remy-auth-contract';
import { Allowed } from '@joeblew999/remy-ui/allowed';
import { actions } from '@joeblew999/remy-ui/api/policy';
import type { RelationEngine } from '@joeblew999/remy-ui/api/relations';

// Types only, never run: an app's vocabulary types its action names all the way through, from the
// contract's policy to the engine's answers to the page. Each line below marked as an expected error
// is a name the vocabulary does not define; project:typecheck fails the day one of them slips through.
declare const engine: RelationEngine<typeof notesVocabulary>;
declare const note: Note;

export async function typed() {
  const may = actions(notesVocabulary);
  may('EDIT_NOTE');
  // @ts-expect-error a contract cannot name an action the vocabulary does not define
  may('PUBLISH_NOTE');

  await engine.can('EDIT_NOTE', null, note.id);
  // @ts-expect-error nor can the server ask about one
  await engine.can('PUBLISH_NOTE', null, note.id);
  // @ts-expect-error or about a relation that is not there
  await engine.holds('NOTE_OWNER', null, note.id);

  const can = (await engine.canFor('NOTE', null, [note.id])).get(note.id)!;
  can.EDIT_NOTE satisfies boolean;
  // @ts-expect-error a note's permissions hold a note's actions only: creating one is about no note
  can.CREATE_NOTE;

  return <>
    <Allowed can={note.can} action="EDIT_NOTE">an action the note carries</Allowed>
    {/* @ts-expect-error a page cannot offer an action the row does not carry */}
    <Allowed can={note.can} action="CREATE_NOTE">not one</Allowed>
  </>;
}
