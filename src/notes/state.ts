import { ORPCError } from '@orpc/client';
import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { client } from '../api/client';

/**
 * What the notes page shows: the signed-in person's notes with what they may do to each, or null when
 * nobody is signed in. The contract's `notes.list`, called through the API client inside the server
 * (the router itself, behind the guard, with the page's own cookies), as the account page asks `me`.
 */
export const notesState = createServerFn({ method: 'GET' }).handler(async () => {
  // About one person: never kept by a cache.
  setResponseHeader('Cache-Control', 'no-store');
  try {
    return await client.notes.list();
  } catch (error) {
    if (error instanceof ORPCError && error.code === 'UNAUTHORIZED') return null;
    throw error;
  }
});
