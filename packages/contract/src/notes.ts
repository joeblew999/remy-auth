import { z } from 'zod';
import { defineVocabulary, type Can } from '@joeblew999/remy-ui/api/relations';

// The notes demo's relation vocabulary and shapes: who may do what to a note is answered by relations
// (its author, the people it is shared with as editors or readers), never by a role. One source for
// the contract's policies, the server's relation engine, and the page, so an action the vocabulary
// does not define does not type-check anywhere.

/** The notes demo's vocabulary, as data, for the platform's relation engine (@joeblew999/remy-ui/api/relations). */
export const notesVocabulary = defineVocabulary({
  objectTypes: [
    { code: 'NOTE', tableName: 'note' },
    { code: 'PLATFORM' },
  ],
  relations: [
    // Whoever wrote it: a column on the note itself.
    { code: 'NOTE_AUTHOR', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'note', objectColumn: 'id', userColumn: 'author_id' },
    // Whoever it is shared with, by the role the author gave them.
    { code: 'NOTE_EDITOR', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'note_share', objectColumn: 'note_id', userColumn: 'user_id', filterColumn: 'role', filterValue: 'editor' },
    { code: 'NOTE_READER', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'note_share', objectColumn: 'note_id', userColumn: 'user_id', filterColumn: 'role', filterValue: 'reader' },
    { code: 'ANY_SIGNED_IN', objectTypeCode: 'PLATFORM', via: 'everyone' },
    { code: 'PUBLIC', objectTypeCode: 'PLATFORM', via: 'everyone' },
  ],
  actions: [
    { code: 'CREATE_NOTE', objectTypeCode: 'PLATFORM' },
    { code: 'VIEW_NOTE', objectTypeCode: 'NOTE' },
    { code: 'EDIT_NOTE', objectTypeCode: 'NOTE' },
    { code: 'SHARE_NOTE', objectTypeCode: 'NOTE' },
    { code: 'DELETE_NOTE', objectTypeCode: 'NOTE' },
  ],
  grants: {
    CREATE_NOTE: [{ relation: 'ANY_SIGNED_IN' }],
    VIEW_NOTE: [{ relation: 'NOTE_AUTHOR' }, { relation: 'NOTE_EDITOR' }, { relation: 'NOTE_READER' }],
    EDIT_NOTE: [{ relation: 'NOTE_AUTHOR' }, { relation: 'NOTE_EDITOR' }],
    SHARE_NOTE: [{ relation: 'NOTE_AUTHOR' }],
    DELETE_NOTE: [{ relation: 'NOTE_AUTHOR' }],
  },
});

/** What a note carries for its viewer: each action on it, allowed or not, as the server answered. */
export type NoteCan = Can<typeof notesVocabulary, 'NOTE'>;
const noteCan = z.object({ VIEW_NOTE: z.boolean(), EDIT_NOTE: z.boolean(), SHARE_NOTE: z.boolean(), DELETE_NOTE: z.boolean() }) satisfies z.ZodType<NoteCan>;

/** The roles a note is shared in. */
export const shareRoles = ['reader', 'editor'] as const;

/** A note as its viewer sees it. It names nobody: not its author, not who else it is shared with. */
export const note = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  mine: z.boolean().describe('Whether the viewer wrote it'),
  sharedWith: z.number().int().describe('How many people it is shared with; only its author is told, others read 0'),
  updatedAt: z.string().describe('When it last changed, ISO 8601'),
  can: noteCan.describe('What this viewer may do to it'),
});
export type Note = z.infer<typeof note>;

/** The viewer's notes (written by them or shared with them), and what they may do that is about no note yet. */
export const noteList = z.object({
  notes: z.array(note),
  can: z.object({ CREATE_NOTE: z.boolean() }),
});
export type NoteList = z.infer<typeof noteList>;

const words = { title: z.string().trim().min(1).max(120), body: z.string().max(4000) };
export const noteDraft = z.object(words);
export const noteEdit = z.object({ id: z.string(), ...words });
export const noteId = z.object({ id: z.string() });
export const noteShare = z.object({ id: z.string(), email: z.email().max(254), role: z.enum(shareRoles) });
