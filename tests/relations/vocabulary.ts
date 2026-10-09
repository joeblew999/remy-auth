import { defineVocabulary } from '@joeblew999/remy-ui/api/relations';

// A small vocabulary in remy-sport's own row shapes, one row for each way it derives a relation:
// a column on the object, a membership table, a filtered one, one reached through another entity
// and held between dates, two inherited from a parent, platform roles, signed-in and public. The
// table names are the model's plurals and the stored roles are lower case, as there, so the
// vocabulary's two maps are exercised too. tests/relations.spec.ts runs it on a real D1.
export const vocabulary = defineVocabulary({
  objectTypes: [
    { code: 'EVENT', tableName: 'events' },
    { code: 'TEAM', tableName: 'teams' },
    { code: 'PLAYER', tableName: 'players' },
    { code: 'GAME', tableName: 'games', parentTypeCode: 'EVENT', parentColumn: 'event_id' },
    { code: 'PLATFORM' },
  ],
  relations: [
    { code: 'OWNER', objectTypeCode: 'EVENT', via: 'table', sourceTable: 'events', objectColumn: 'id', userColumn: 'organizer_user_id' },
    { code: 'CO_ORGANIZER', objectTypeCode: 'EVENT', via: 'table', sourceTable: 'event_co_organizers', objectColumn: 'event_id', userColumn: 'user_id', filterColumn: 'status_code', filterValue: 'ACCEPTED' },
    { code: 'HEAD_COACH', objectTypeCode: 'TEAM', via: 'table', sourceTable: 'team_coaches', objectColumn: 'team_id', userColumn: 'user_id', filterColumn: 'coach_role_code', filterValue: 'HEAD' },
    { code: 'ASSISTANT_COACH', objectTypeCode: 'TEAM', via: 'table', sourceTable: 'team_coaches', objectColumn: 'team_id', userColumn: 'user_id', filterColumn: 'coach_role_code', filterValue: 'ASSISTANT' },
    { code: 'TEAM_PLAYER', objectTypeCode: 'TEAM', via: 'table', sourceTable: 'player_teams', objectColumn: 'team_id', userColumn: 'user_id', throughTable: 'players', throughColumn: 'player_id', activeFromColumn: 'from_date', activeToColumn: 'to_date' },
    { code: 'SELF', objectTypeCode: 'PLAYER', via: 'table', sourceTable: 'players', objectColumn: 'id', userColumn: 'user_id' },
    { code: 'GUARDIAN', objectTypeCode: 'PLAYER', via: 'table', sourceTable: 'guardians', objectColumn: 'player_id', userColumn: 'user_id' },
    { code: 'PLAYER_HEAD_COACH', objectTypeCode: 'PLAYER', via: 'parent', sourceTable: 'player_teams', objectColumn: 'player_id', throughColumn: 'team_id', activeFromColumn: 'from_date', activeToColumn: 'to_date', parentRelation: 'HEAD_COACH' },
    { code: 'GAME_REFEREE', objectTypeCode: 'GAME', via: 'table', sourceTable: 'game_referees', objectColumn: 'game_id', userColumn: 'user_id' },
    { code: 'GAME_EVENT_OWNER', objectTypeCode: 'GAME', via: 'parent', sourceTable: 'games', objectColumn: 'id', throughColumn: 'event_id', parentRelation: 'OWNER' },
    { code: 'GAME_EVENT_CO_ORGANIZER', objectTypeCode: 'GAME', via: 'parent', sourceTable: 'games', objectColumn: 'id', throughColumn: 'event_id', parentRelation: 'CO_ORGANIZER' },
    { code: 'PLATFORM_ADMIN', objectTypeCode: 'PLATFORM', via: 'role', roleCode: 'ADMIN' },
    { code: 'ANY_COACH', objectTypeCode: 'PLATFORM', via: 'role', roleCode: 'COACH' },
    { code: 'ANY_SIGNED_IN', objectTypeCode: 'PLATFORM', via: 'everyone' },
    { code: 'PUBLIC', objectTypeCode: 'PLATFORM', via: 'everyone' },
  ],
  actions: [
    { code: 'VIEW_EVENT', objectTypeCode: 'EVENT' },
    { code: 'EDIT_EVENT', objectTypeCode: 'EVENT' },
    { code: 'GENERATE_BRACKETS', objectTypeCode: 'EVENT' },
    { code: 'DELETE_EVENT', objectTypeCode: 'EVENT' },
    { code: 'ENTER_SCORES', objectTypeCode: 'GAME' },
    { code: 'EDIT_TEAM', objectTypeCode: 'TEAM' },
    { code: 'VIEW_ROSTER', objectTypeCode: 'TEAM' },
    { code: 'REGISTER_TEAM_FOR_EVENT', objectTypeCode: 'TEAM' },
    { code: 'EDIT_PLAYER', objectTypeCode: 'PLAYER' },
    { code: 'CREATE_TEAM', objectTypeCode: 'PLATFORM' },
    { code: 'FOLLOW', objectTypeCode: 'PLATFORM' },
  ],
  grants: {
    VIEW_EVENT: [{ relation: 'PUBLIC', eventTypes: [] }],
    EDIT_EVENT: [{ relation: 'OWNER', eventTypes: [] }, { relation: 'CO_ORGANIZER', eventTypes: [] }, { relation: 'PLATFORM_ADMIN', eventTypes: [] }],
    // A camp has no brackets: the owner's grant applies to tournaments only.
    GENERATE_BRACKETS: [{ relation: 'OWNER', eventTypes: ['TOURNAMENT'] }],
    // Nobody: an action with no grants.
    DELETE_EVENT: [],
    // Narrowed by the subtype of the game's event, one hop up.
    ENTER_SCORES: [{ relation: 'GAME_REFEREE', eventTypes: [] }, { relation: 'GAME_EVENT_OWNER', eventTypes: ['TOURNAMENT', 'LEAGUE'] }],
    EDIT_TEAM: [{ relation: 'HEAD_COACH', eventTypes: [] }, { relation: 'PLATFORM_ADMIN', eventTypes: [] }],
    VIEW_ROSTER: [{ relation: 'HEAD_COACH', eventTypes: [] }, { relation: 'ASSISTANT_COACH', eventTypes: [] }, { relation: 'TEAM_PLAYER', eventTypes: [] }],
    // About a pair: acts on a team, narrowed by an event the team is not part of.
    REGISTER_TEAM_FOR_EVENT: [{ relation: 'HEAD_COACH', eventTypes: ['TOURNAMENT'] }],
    EDIT_PLAYER: [{ relation: 'SELF', eventTypes: [] }, { relation: 'GUARDIAN', eventTypes: [] }, { relation: 'PLAYER_HEAD_COACH', eventTypes: [] }, { relation: 'PLATFORM_ADMIN', eventTypes: [] }],
    CREATE_TEAM: [{ relation: 'ANY_COACH', eventTypes: [] }, { relation: 'PLATFORM_ADMIN', eventTypes: [] }],
    FOLLOW: [{ relation: 'ANY_SIGNED_IN', eventTypes: [] }],
  },
  roles: { ADMIN: 'admin', COACH: 'coach' },
  tables: { events: 'event', teams: 'team', players: 'player', games: 'game', event_co_organizers: 'event_co_organizer', team_coaches: 'team_coach', player_teams: 'player_team', guardians: 'guardian', game_referees: 'game_referee' },
  narrow: { objectTypeCode: 'EVENT', column: 'type_code', grantField: 'eventTypes' },
});

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/**
 * The schema and rows the checks ask about. Dates are relative to today, so a spell is current, over
 * or not begun whenever this runs: a function, because a Worker has no clock outside a request.
 */
export const statements = () => [
  'create table "event" ("id" text primary key, "organizer_user_id" text not null, "type_code" text not null)',
  'create table "event_co_organizer" ("event_id" text not null, "user_id" text not null, "status_code" text not null)',
  'create table "team" ("id" text primary key)',
  'create table "team_coach" ("team_id" text not null, "user_id" text not null, "coach_role_code" text not null)',
  'create table "player" ("id" text primary key, "user_id" text)',
  'create table "player_team" ("player_id" text not null, "team_id" text not null, "from_date" text not null, "to_date" text)',
  'create table "guardian" ("player_id" text not null, "user_id" text not null)',
  'create table "game" ("id" text primary key, "event_id" text not null)',
  'create table "game_referee" ("game_id" text not null, "user_id" text not null)',
  // A tournament and a camp, both the owner's; one accepted co-organizer and one still invited.
  `insert into "event" values ('e_cup', 'u_owner', 'TOURNAMENT'), ('e_camp', 'u_owner', 'CAMP')`,
  `insert into "event_co_organizer" values ('e_cup', 'u_coorg', 'ACCEPTED'), ('e_cup', 'u_invited', 'INVITED')`,
  `insert into "game" values ('g_cup', 'e_cup'), ('g_camp', 'e_camp')`,
  `insert into "game_referee" values ('g_camp', 'u_ref')`,
  `insert into "team" values ('t_red'), ('t_blue')`,
  `insert into "team_coach" values ('t_red', 'u_head', 'HEAD'), ('t_red', 'u_assistant', 'ASSISTANT'), ('t_blue', 'u_assistant', 'HEAD')`,
  // p_now plays for red today; p_left did until last month; p_soon joins blue next month; p_guest has no account.
  `insert into "player" values ('p_now', 'u_player'), ('p_left', 'u_left'), ('p_soon', 'u_soon'), ('p_guest', null)`,
  `insert into "player_team" values ('p_now', 't_red', '${day(-400)}', null), ('p_left', 't_red', '${day(-400)}', '${day(-30)}'), ('p_soon', 't_blue', '${day(30)}', null), ('p_guest', 't_red', '${day(-10)}', '${day(10)}')`,
  `insert into "guardian" values ('p_now', 'u_parent')`,
];
