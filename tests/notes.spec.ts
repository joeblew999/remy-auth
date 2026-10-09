import { test, expect, type APIRequestContext } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { notesVocabulary, type Note, type NoteList } from '@joeblew999/remy-auth-contract';
import { schemaProblems } from '@joeblew999/remy-ui/api/relations';
import { allowedActions, offeredActions } from '@joeblew999/remy-ui/allowed.checks';
import { collectErrors, localizedPath } from '@joeblew999/remy-ui/checks';
import { m } from '@joeblew999/remy-ui/messages';
import { local, newEmail, signedIn, signedInAsSeeded, visitor } from './people';

// The notes demo (.plans/auth-service.md): relations decide who may do what, on the real Worker with
// its own D1. The owner's two requirements are what is checked: the rules cannot go unused on the
// server (every call is refused or allowed by the relation engine, through the guard), and the screen
// offers exactly what the server allows. People sign in for real (tests/people.ts), so these run
// against the local target.

const actionsOnANote = ['EDIT_NOTE', 'SHARE_NOTE', 'DELETE_NOTE'] as const;
const list = async (who: APIRequestContext) => {
  const response = await who.get('/api/notes');
  expect(response.status()).toBe(200);
  return await response.json() as NoteList;
};
/** Takes the action for real and answers the status: the edit keeps the words, the share names nobody new, the delete is the delete. */
const take = async (who: APIRequestContext, action: typeof actionsOnANote[number], note: Pick<Note, 'id' | 'title' | 'body'>) => (await {
  EDIT_NOTE: () => who.post(`/api/notes/${note.id}`, { data: { title: note.title, body: note.body } }),
  SHARE_NOTE: () => who.post(`/api/notes/${note.id}/share`, { data: { email: 'nobody-yet@example.test', role: 'reader' } }),
  DELETE_NOTE: () => who.post(`/api/notes/${note.id}/delete`, { data: {} }),
}[action]()).status();

test('the notes vocabulary names only tables and columns its migrations make', () => {
  const database = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations-demo').filter(name => name.endsWith('.sql')).sort()) database.exec(readFileSync(`migrations-demo/${file}`, 'utf8'));
  const columnsOf = (table: string) => {
    const columns = database.prepare('select name from pragma_table_info(?)').all(table).map(row => String(row.name));
    return columns.length ? columns : undefined;
  };
  expect(schemaProblems(notesVocabulary, columnsOf)).toEqual([]);
  // The rule sees a drift, so an empty list above means something.
  expect(schemaProblems({ ...notesVocabulary, relations: [...notesVocabulary.relations, { code: 'NOTE_OWNER', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'note', objectColumn: 'id', userColumn: 'owner_id' }] }, columnsOf))
    .toEqual(['relation NOTE_OWNER: note has no column owner_id']);
});

test('a note is its author\'s; each person it is shared with may do exactly what their relation allows, and the server refuses the rest', async ({ playwright, baseURL }) => {
  test.skip(!local, 'people sign in through the local mail capture');
  const [author, editor, reader, outsider] = await Promise.all(['author', 'editor', 'reader', 'outsider'].map(name => signedIn(playwright, baseURL, newEmail(name))));
  const stranger = await visitor(playwright, baseURL);

  // Anyone signed in may write a note; it is theirs.
  expect((await list(author)).can).toEqual({ CREATE_NOTE: true });
  const created = await author.post('/api/notes', { data: { title: 'Squad list', body: 'Friday, 6 pm.' } });
  expect(created.status()).toBe(200);
  const note = await created.json() as Note;
  expect(note).toEqual({ id: expect.any(String), title: 'Squad list', body: 'Friday, 6 pm.', mine: true, sharedWith: 0, updatedAt: expect.any(String), can: { VIEW_NOTE: true, EDIT_NOTE: true, SHARE_NOTE: true, DELETE_NOTE: true } });

  // Shared by address: an editor, a reader, and an address with no account. The answer is the same for all three.
  for (const [email, role] of [[editor.email, 'editor'], [reader.email, 'reader'], [newEmail('no-account'), 'reader']] as const) {
    const shared = await author.post(`/api/notes/${note.id}/share`, { data: { email, role } });
    expect(shared.status(), email).toBe(200);
    expect(Object.keys(await shared.json()).sort(), email).toEqual(Object.keys(note).sort());
  }
  // Sharing with yourself is nothing.
  expect((await author.post(`/api/notes/${note.id}/share`, { data: { email: author.email, role: 'reader' } })).status()).toBe(200);
  expect((await list(author)).notes).toEqual([{ ...note, sharedWith: 3, updatedAt: expect.any(String) }]);

  // What each person is told they may do: the relation's grants, nothing from a role.
  const seen = { author: (await list(author)).notes, editor: (await list(editor)).notes, reader: (await list(reader)).notes, outsider: (await list(outsider)).notes };
  expect(seen.editor).toEqual([{ ...note, mine: false, sharedWith: 0, updatedAt: expect.any(String), can: { VIEW_NOTE: true, EDIT_NOTE: true, SHARE_NOTE: false, DELETE_NOTE: false } }]);
  expect(seen.reader).toEqual([{ ...note, mine: false, sharedWith: 0, updatedAt: expect.any(String), can: { VIEW_NOTE: true, EDIT_NOTE: false, SHARE_NOTE: false, DELETE_NOTE: false } }]);
  expect(seen.outsider).toEqual([]);
  // A note names nobody: not its author, not who it is shared with.
  for (const [who, body] of Object.entries({ editor: JSON.stringify(seen.editor), reader: JSON.stringify(seen.reader) })) {
    for (const email of [author.email, editor.email, reader.email]) expect(body, `${who}'s list names ${email}`).not.toContain(email);
  }

  // The server allows exactly what it said, for every person and every action: an offered action
  // never answers 403, and one not offered always does. (The author's delete comes last.)
  for (const [who, person] of [['editor', editor], ['reader', reader]] as const) {
    for (const action of actionsOnANote) expect(await take(person, action, note), `${who} ${action}`).toBe(seen[who][0].can[action] ? 200 : 403);
  }
  // Somebody with no relation to the note is refused everything; nobody at all is refused first.
  for (const action of actionsOnANote) {
    expect(await take(outsider, action, note), `outsider ${action}`).toBe(403);
    expect(await take(stranger, action, note), `stranger ${action}`).toBe(401);
  }
  expect((await stranger.get('/api/notes')).status()).toBe(401);
  // A note that does not exist is 404 to everyone signed in: "forbidden" never says which ids are real.
  for (const person of [author, outsider]) for (const action of actionsOnANote) expect(await take(person, action, { ...note, id: 'no-such-note' }), action).toBe(404);

  // The editor's change is the note everyone sees; the reader still may not change it.
  expect((await editor.post(`/api/notes/${note.id}`, { data: { title: 'Squad list', body: 'Friday, 7 pm.' } })).status()).toBe(200);
  expect((await list(reader)).notes[0].body).toBe('Friday, 7 pm.');

  // The author may do everything, and deleting is the end of it for everyone.
  for (const action of actionsOnANote) expect(await take(author, action, note), `author ${action}`).toBe(200);
  for (const person of [author, editor, reader]) expect((await list(person)).notes).toEqual([]);
  expect(await take(editor, 'EDIT_NOTE', note)).toBe(404);
  await Promise.all([author, editor, reader, outsider, stranger].map(context => context.dispose()));
});

test('a note shared with an address belongs to whoever proves the address is theirs, and to nobody before', async ({ playwright, baseURL }) => {
  test.skip(!local, 'people sign in through the local mail capture');
  const author = await signedIn(playwright, baseURL, newEmail('author'));
  const invited = newEmail('invited');
  const note = await (await author.post('/api/notes', { data: { title: 'For later', body: '' } })).json() as Note;
  expect((await author.post(`/api/notes/${note.id}/share`, { data: { email: invited.toUpperCase(), role: 'editor' } })).status()).toBe(200);
  // The person signs in with that address afterwards: the code proved it is theirs, and the note is there.
  const person = await signedIn(playwright, baseURL, invited);
  expect((await list(person)).notes.map(found => [found.id, found.can.EDIT_NOTE])).toEqual([[note.id, true]]);
  // The author changes the role: the same share, now a reader's.
  expect((await author.post(`/api/notes/${note.id}/share`, { data: { email: invited, role: 'reader' } })).status()).toBe(200);
  expect((await list(person)).notes[0].can).toEqual({ VIEW_NOTE: true, EDIT_NOTE: false, SHARE_NOTE: false, DELETE_NOTE: false });
  expect((await list(author)).notes[0].sharedWith).toBe(1);
  await Promise.all([author, person].map(context => context.dispose()));
});

test('the notes page offers each person exactly what the server allows them, and nothing it offers is refused', async ({ browser, playwright, baseURL }) => {
  test.skip(!local, 'people sign in through the local mail capture');
  const o = { locale: 'en' } as const;
  const notesPath = localizedPath('/app/notes', 'en');
  const [author, editor, reader, outsider] = await Promise.all(['author', 'editor', 'reader', 'outsider'].map(name => signedIn(playwright, baseURL, newEmail(name))));
  const note = await (await author.post('/api/notes', { data: { title: 'Squad list', body: 'Friday, 6 pm.' } })).json() as Note;
  for (const [person, role] of [[editor, 'editor'], [reader, 'reader']] as const) expect((await author.post(`/api/notes/${note.id}/share`, { data: { email: person.email, role } })).status()).toBe(200);

  /** The person's own browser, signed in as they are, on the notes page. */
  const open = async (person?: APIRequestContext) => {
    const context = await browser.newContext({ baseURL, storageState: person ? await person.storageState() : undefined });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.goto(notesPath);
    await page.waitForLoadState('networkidle');
    return { page, errors, card: page.locator(`[data-note="${note.id}"]`) };
  };

  // What each person's page offers on the note is what the server answered for them, no more and no less.
  const pages = { author: await open(author), editor: await open(editor), reader: await open(reader) };
  for (const [who, person] of [['author', author], ['editor', editor], ['reader', reader]] as const) {
    const told = (await list(person)).notes.find(found => found.id === note.id)!;
    await expect(pages[who].card, who).toBeVisible();
    expect(await offeredActions(pages[who].card), who).toEqual(allowedActions(told.can, actionsOnANote));
  }
  expect(await offeredActions(pages.reader.card)).toEqual([]);
  await expect(pages.reader.card).toContainText(m.notes_read_only({}, o));
  // Anyone signed in is offered a new note. Somebody with no relation to this one is shown none; nobody at all is asked to sign in.
  expect(await offeredActions(pages.reader.page.locator('main'))).toEqual(['CREATE_NOTE']);
  const elsewhere = await open(outsider);
  await expect(elsewhere.page.locator('[data-notes="none"]')).toBeVisible();
  await expect(elsewhere.card).toHaveCount(0);
  const nobody = await open();
  await expect(nobody.page.locator('[data-notes="signed-out"]')).toBeVisible();
  expect(await offeredActions(nobody.page.locator('main'))).toEqual([]);

  // Using what is offered works. The editor changes the note in their browser...
  await pages.editor.card.getByRole('button', { name: m.notes_edit({}, o) }).click();
  await pages.editor.card.getByLabel(m.notes_body_label({}, o)).fill('Friday, 7 pm.');
  await pages.editor.card.getByRole('button', { name: m.notes_save({}, o) }).click();
  await expect(pages.editor.card.locator('[data-note-field="body"]')).toHaveText('Friday, 7 pm.');
  expect((await list(reader)).notes[0].body).toBe('Friday, 7 pm.');

  // ...and the author shares it once more, then deletes it, in theirs.
  await pages.author.page.reload();
  await expect(pages.author.card).toContainText(m.notes_shared_count({ count: 2 }, o));
  await pages.author.card.getByRole('button', { name: m.notes_share({}, o) }).click();
  await pages.author.card.getByLabel(m.notes_share_email_label({}, o)).fill(outsider.email);
  await pages.author.card.getByRole('button', { name: m.notes_share_as_reader({}, o) }).click();
  await expect(pages.author.card).toContainText(m.notes_shared_count({ count: 3 }, o));
  expect((await list(outsider)).notes.map(found => found.can)).toEqual([{ VIEW_NOTE: true, EDIT_NOTE: false, SHARE_NOTE: false, DELETE_NOTE: false }]);
  await pages.author.card.getByRole('button', { name: m.notes_delete({}, o) }).click();
  await expect(pages.author.card).toHaveCount(0);
  expect((await list(editor)).notes).toEqual([]);

  // Writing a note from the page: the form's own rule first, then the note is there, the author's.
  await pages.author.page.getByRole('button', { name: m.notes_save({}, o) }).click();
  await expect(pages.author.page.locator('#new-title-error')).toHaveText(m.notes_title_required({}, o));
  await pages.author.page.getByLabel(m.notes_title_label({}, o)).fill('From the page');
  await pages.author.page.getByRole('button', { name: m.notes_save({}, o) }).click();
  await expect(pages.author.page.locator('[data-note-field="title"]', { hasText: 'From the page' })).toBeVisible();

  // Nothing any page offered was refused, and no page logged an error.
  for (const [who, { errors }] of Object.entries({ ...pages, elsewhere, nobody })) expect(errors, who).toEqual([]);
  await Promise.all([author, editor, reader, outsider].map(context => context.dispose()));
});

test('the seeded people hold the seeded relations, and an administrator, by role alone, may see and remove any note but not change it', async ({ browser, playwright, baseURL }) => {
  test.skip(!local, 'only the local environment offers seeded people');
  const o = { locale: 'en' } as const;
  const [ada, ben, cleo, dev, eli] = await Promise.all(['ada', 'ben', 'cleo', 'dev', 'eli'].map(name => signedInAsSeeded(playwright, baseURL, `${name}@remy.test`)));
  const squad = async (who: APIRequestContext) => (await list(who)).notes.find(note => note.id === 'note_squad')?.can;
  // The same seeded note, seen through four different relations and through none.
  expect(await squad(ben)).toEqual({ VIEW_NOTE: true, EDIT_NOTE: true, SHARE_NOTE: true, DELETE_NOTE: true });
  expect(await squad(cleo)).toEqual({ VIEW_NOTE: true, EDIT_NOTE: true, SHARE_NOTE: false, DELETE_NOTE: false });
  expect(await squad(dev)).toEqual({ VIEW_NOTE: true, EDIT_NOTE: false, SHARE_NOTE: false, DELETE_NOTE: false });
  expect(await squad(eli)).toBeUndefined();
  // The administrator holds no relation to it: the role is what lets them see it and remove it, and nothing more.
  expect(await squad(ada)).toEqual({ VIEW_NOTE: true, EDIT_NOTE: false, SHARE_NOTE: false, DELETE_NOTE: true });

  // On a note written for this check: the administrator's page offers Delete alone, the server refuses the rest, and Delete works.
  const author = await signedIn(playwright, baseURL, newEmail('author'));
  const note = await (await author.post('/api/notes', { data: { title: `To moderate ${newEmail('n')}`, body: '' } })).json() as Note;
  expect(await take(ada, 'EDIT_NOTE', note)).toBe(403);
  expect(await take(ada, 'SHARE_NOTE', note)).toBe(403);
  const context = await browser.newContext({ baseURL, storageState: await ada.storageState() });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await page.goto(localizedPath('/app/notes', 'en'));
  const card = page.locator(`[data-note="${note.id}"]`);
  await expect(card).toBeVisible();
  expect(await offeredActions(card)).toEqual(['DELETE_NOTE']);
  await card.getByRole('button', { name: m.notes_delete({}, o) }).click();
  await expect(card).toHaveCount(0);
  expect((await list(author)).notes).toEqual([]);
  expect(errors).toEqual([]);
  await Promise.all([ada, ben, cleo, dev, eli, author].map(who => who.dispose()));
});
