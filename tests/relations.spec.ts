import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { unstable_startWorker } from 'wrangler';
import { defineVocabulary, schemaProblems, vocabularyProblems, type Vocabulary } from '@joeblew999/remy-ui/api/relations';
import { statements, vocabulary } from './relations/vocabulary';

// The relation engine (@joeblew999/remy-ui/api/relations) on a real D1 in the Workers runtime, over a
// vocabulary in remy-sport's row shapes (tests/relations/vocabulary.ts): every way it derives a
// relation, asked in every direction. tests/relations/worker.ts builds and seeds the database and
// answers in one response; this starts it with Wrangler. It touches neither the app nor its databases.

let answers: Record<string, any>;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.setTimeout(60_000);
  const worker = await unstable_startWorker({ config: 'tests/relations/wrangler.jsonc', dev: { server: { port: 0 }, inspector: false, watch: false, logLevel: 'error', persist: false } });
  try {
    await worker.ready;
    answers = await (await worker.fetch('http://relations.test/')).json() as typeof answers;
  } finally {
    await worker.dispose();
  }
});

test('a relation is held on exactly the objects its rows say, for each way of deriving one', () => {
  expect(answers.heldAmong).toEqual({
    // A column on the object itself.
    owner: ['e_camp', 'e_cup'],
    // A membership table, only the rows its filter keeps: an invitation is not yet a relation.
    coOrganizer: ['e_cup'],
    invitedCoOrganizer: [],
    headCoach: ['t_red'],
    assistantAsHead: ['t_blue'],
    assistant: ['t_red'],
    // Reached through another entity, and only between its dates: now, no longer, not yet.
    playerNow: ['t_red'],
    playerLeft: [],
    playerSoon: [],
    // Inherited from the parent, with the parent relation's own filter.
    gameEventOwner: ['g_camp', 'g_cup'],
    gameEventCoOrganizer: ['g_cup'],
    gameEventInvited: [],
    // Inherited through every current squad; the guest has no account but is on the coach's team.
    playerHeadCoach: ['p_guest', 'p_now'],
    // The platform role, as the session stores it.
    admin: ['t_blue', 't_red'],
    adminWithoutRole: [],
    // A stranger holds what everyone holds, and nothing else.
    stranger: [],
    publicForStranger: ['e_camp', 'e_cup'],
    signedInForStranger: [],
    unknownRelation: [],
    // More ids than one statement may bind.
    acrossBatches: ['t_red'],
    // Ids and user ids are bound values, never SQL.
    idThatIsSql: [],
  });
  expect(answers.holds).toEqual({ owner: true, ownerOfNothing: false, coachRoleNeedsNoObject: true, playerHeadCoach: true, playerHeadCoachAfterLeaving: false });
});

test('the same relations answer the other two questions: which objects are this person\'s, and who holds one', () => {
  expect(answers.objectsHeldBy).toEqual({
    owner: ['e_camp', 'e_cup'],
    assistantAsHead: ['t_blue'],
    playerNow: ['t_red'],
    playerLeft: [],
    gameEventOwner: ['g_camp', 'g_cup'],
    playerHeadCoach: ['p_guest', 'p_now'],
    // A platform relation is on no object.
    role: [],
  });
  expect(answers.usersHolding).toEqual({
    headCoach: ['u_head'],
    // A player with no account is on the team sheet and is nobody to notify.
    teamPlayers: ['u_player'],
    gameEventCoOrganizer: ['u_coorg'],
    // "Everyone signed in" is no bounded set of people.
    everyone: [],
  });
  expect(answers.audience).toEqual({ viewRoster: ['u_assistant', 'u_head', 'u_player'], editPlayer: ['u_head', 'u_parent', 'u_player'] });
});

test('an action is allowed by any one relation it is granted to, and it fails closed', () => {
  expect(answers.can).toEqual({
    strangerViewsEvent: true,
    strangerEditsEvent: false,
    strangerFollows: false,
    signedInFollows: true,
    ownerEdits: true,
    coOrganizerEdits: true,
    invitedEdits: false,
    adminEditsAny: true,
    // No grants: nobody, the administrator included. Unknown: nobody.
    nobodyDeletes: false,
    unknownAction: false,
    // A platform action needs no object: the team does not exist yet.
    coachCreatesTeam: true,
    ownerCreatesTeam: false,
    // A grant narrowed by the object's own subtype, and by its parent's.
    bracketsForCup: true,
    bracketsForCamp: false,
    ownerScoresCupGame: true,
    ownerScoresCampGame: false,
    refereeScoresCampGame: true,
    // About a pair: only the caller knows the other half, and without it the answer is no.
    coachRegistersForCup: true,
    coachRegistersForCamp: false,
    coachRegistersForNothing: false,
  });
  expect(answers.canAll).toEqual({ ownerScores: ['g_cup'], adminEditsTeams: ['t_blue', 't_red'] });
});

test('a whole list gets every row\'s actions at once: what a screen receives with its data', () => {
  expect(answers.canFor).toEqual({
    ownerEvents: {
      e_cup: { VIEW_EVENT: true, EDIT_EVENT: true, GENERATE_BRACKETS: true, DELETE_EVENT: false },
      e_camp: { VIEW_EVENT: true, EDIT_EVENT: true, GENERATE_BRACKETS: false, DELETE_EVENT: false },
    },
    strangerEvents: { e_cup: { VIEW_EVENT: true, EDIT_EVENT: false, GENERATE_BRACKETS: false, DELETE_EVENT: false } },
    headCoachTeams: { t_red: { EDIT_TEAM: true, VIEW_ROSTER: true }, t_blue: { EDIT_TEAM: false, VIEW_ROSTER: false } },
    parentPlayers: { p_now: { EDIT_PLAYER: true }, p_left: { EDIT_PLAYER: false }, p_soon: { EDIT_PLAYER: false }, p_guest: { EDIT_PLAYER: false } },
    headCoachPlayers: { p_now: { EDIT_PLAYER: true }, p_left: { EDIT_PLAYER: false }, p_soon: { EDIT_PLAYER: false }, p_guest: { EDIT_PLAYER: true } },
  });
  // The action's own object type says which table it acts on; an action about a pair is no row's to answer.
  expect(answers.objects).toEqual({ tableOfEditTeam: 'team', tableOfCreateTeam: null, teamExists: true, teamMissing: false, actionsOnTeam: ['EDIT_TEAM', 'VIEW_ROSTER'] });
});

test('a vocabulary that does not hold together is refused, with the reason', () => {
  expect(vocabularyProblems(vocabulary)).toEqual([]);
  const broken: Vocabulary = {
    objectTypes: [{ code: 'NOTE', tableName: 'note' }, { code: 'NOTE', tableName: 'note; drop table note' }, { code: 'PAGE', tableName: 'page', parentTypeCode: 'BOOK', parentColumn: 'book_id' }, { code: 'PLATFORM' }],
    relations: [
      { code: 'AUTHOR', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'note', objectColumn: 'id' },
      { code: 'READER', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'share', objectColumn: 'note_id', userColumn: 'user_id', filterColumn: 'role' },
      { code: 'UP', objectTypeCode: 'PAGE', via: 'parent', sourceTable: 'page', objectColumn: 'id', throughColumn: 'note_id', parentRelation: 'DOWN' },
      { code: 'DOWN', objectTypeCode: 'PAGE', via: 'parent', sourceTable: 'page', objectColumn: 'id', throughColumn: 'note_id', parentRelation: 'UP' },
      { code: 'LOST', objectTypeCode: 'NOTE', via: 'parent', sourceTable: 'note', objectColumn: 'id', throughColumn: 'book_id', parentRelation: 'NOWHERE' },
      { code: 'ADMIN', objectTypeCode: 'PLATFORM', via: 'role' },
      { code: 'GUESS', objectTypeCode: 'SHELF', via: 'magic' as never },
    ],
    actions: [{ code: 'EDIT_NOTE', objectTypeCode: 'NOTE' }, { code: 'EDIT_PAGE', objectTypeCode: 'PAGE' }],
    grants: { EDIT_NOTE: [{ relation: 'AUTHOR' }, { relation: 'NOBODY' }], EDIT_PAGE: [{ relation: 'AUTHOR' }], PUBLISH: [{ relation: 'AUTHOR' }] },
  };
  expect(vocabularyProblems(broken)).toEqual([
    'object type NOTE: defined twice',
    'object type NOTE: tableName "note; drop table note" is not a table or column name',
    'object type PAGE: its parent BOOK is not an object type',
    'relation AUTHOR: userColumn "undefined" is not a table or column name',
    'relation READER: filterColumn and filterValue go together',
    'relation UP: its inheritance loops through UP',
    'relation DOWN: its inheritance loops through DOWN',
    'relation LOST: inherits NOWHERE, which is not a relation',
    'relation ADMIN: a role relation needs roleCode',
    'relation GUESS: SHELF is not an object type',
    'relation GUESS: via "magic" is not table, parent, role or everyone',
    'action EDIT_NOTE: granted to NOBODY, which is not a relation',
    'action EDIT_PAGE: acts on PAGE but is granted to AUTHOR, a relation on NOTE',
    'grants: PUBLISH is not an action',
  ]);
  expect(() => defineVocabulary(broken)).toThrow(/the vocabulary has 14 problem/);
});

test('a vocabulary that names a table or column the database lacks is caught before it fails closed in use', () => {
  const database = new DatabaseSync(':memory:');
  for (const statement of statements()) database.exec(statement);
  const columnsOf = (table: string) => {
    const columns = database.prepare(`select name from pragma_table_info(?)`).all(table).map(row => String(row.name));
    return columns.length ? columns : undefined;
  };
  expect(schemaProblems(vocabulary, columnsOf)).toEqual([]);
  const drifted: Vocabulary = { ...vocabulary, relations: [...vocabulary.relations,
    { code: 'SPONSOR', objectTypeCode: 'TEAM', via: 'table', sourceTable: 'team_sponsors', objectColumn: 'team_id', userColumn: 'user_id' },
    { code: 'CAPTAIN', objectTypeCode: 'TEAM', via: 'table', sourceTable: 'team_coaches', objectColumn: 'team_id', userColumn: 'captain_id' },
  ] };
  expect(schemaProblems(drifted, columnsOf)).toEqual(['relation SPONSOR: no table team_sponsors', 'relation CAPTAIN: team_coach has no column captain_id']);
});
