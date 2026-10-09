import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { invalidateEverything } from '@joeblew999/remy-ui/invalidate';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { problemPages } from '@joeblew999/remy-ui/problem';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { orpc } from '../api/client';
import { NotesPage } from '../notes/page';
import { notesState } from '../notes/state';

// The notes demo (src/notes/): relations decide who may do what. The loader asks a server function
// for the signed-in person's notes, each with what they may do to it; the page shows exactly that.
// Each action is the contract's own endpoint, which the guard and the relation engine decide again
// on the server, whatever the page showed.
export const Route = createFileRoute('/app/notes')({
  codeSplitGroupings: [['loader', 'component']],
  loader: () => notesState(),
  // Who is signed in, and what is shared with them, can change at any moment: never from the router's cache.
  staleTime: 0,
  gcTime: 0,
  head: () => pageHead({ path: '/app/notes', title: locale => m.notes_title({}, { locale }), description: locale => m.notes_description({}, { locale }) }),
  component: Notes,
  ...problemPages,
});

function Notes() {
  const state = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  const create = useMutation(orpc.notes.create.mutationOptions());
  const update = useMutation(orpc.notes.update.mutationOptions());
  const share = useMutation(orpc.notes.share.mutationOptions());
  const remove = useMutation(orpc.notes.remove.mutationOptions());
  // After every action, allowed or refused, the page asks the server again: what it shows is what is so.
  const then = <T,>(action: (input: T) => Promise<unknown>) => (input: T) => action(input).then(() => setFailed(false), () => setFailed(true)).then(() => invalidateEverything(router, queryClient));
  return <NotesPage locale={getLocale()} state={state} failed={failed} actions={{
    create: then(create.mutateAsync),
    update: then(update.mutateAsync),
    share: then(share.mutateAsync),
    remove: then(remove.mutateAsync),
  }} />;
}
