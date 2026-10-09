import { relationEngine } from '@joeblew999/remy-ui/api/relations';
import { statements, vocabulary } from './vocabulary';

// The relation engine (packages/ui/src/api/relations.js) on a real D1 in the Workers runtime:
// tests/relations.spec.ts starts this Worker, which builds the schema, seeds it and answers every
// question the checks ask in one response.

const user = (id: string, role?: string) => ({ id, role });
const sorted = (values: Iterable<string>) => [...values].sort();

export default {
  async fetch(_request: Request, env: { DB: D1Database }) {
    await env.DB.batch(statements().map(statement => env.DB.prepare(statement)));
    const engine = relationEngine(vocabulary, env.DB);
    const events = ['e_cup', 'e_camp'], games = ['g_cup', 'g_camp'], teams = ['t_red', 't_blue'], players = ['p_now', 'p_left', 'p_soon', 'p_guest'];
    const many = [...Array.from({ length: 240 }, (_, index) => `missing_${index}`), 't_red'];

    return Response.json({
      heldAmong: {
        owner: sorted(await engine.heldAmong('OWNER', user('u_owner'), events)),
        coOrganizer: sorted(await engine.heldAmong('CO_ORGANIZER', user('u_coorg'), events)),
        invitedCoOrganizer: sorted(await engine.heldAmong('CO_ORGANIZER', user('u_invited'), events)),
        headCoach: sorted(await engine.heldAmong('HEAD_COACH', user('u_head'), teams)),
        assistantAsHead: sorted(await engine.heldAmong('HEAD_COACH', user('u_assistant'), teams)),
        assistant: sorted(await engine.heldAmong('ASSISTANT_COACH', user('u_assistant'), teams)),
        playerNow: sorted(await engine.heldAmong('TEAM_PLAYER', user('u_player'), teams)),
        playerLeft: sorted(await engine.heldAmong('TEAM_PLAYER', user('u_left'), teams)),
        playerSoon: sorted(await engine.heldAmong('TEAM_PLAYER', user('u_soon'), teams)),
        gameEventOwner: sorted(await engine.heldAmong('GAME_EVENT_OWNER', user('u_owner'), games)),
        gameEventCoOrganizer: sorted(await engine.heldAmong('GAME_EVENT_CO_ORGANIZER', user('u_coorg'), games)),
        gameEventInvited: sorted(await engine.heldAmong('GAME_EVENT_CO_ORGANIZER', user('u_invited'), games)),
        playerHeadCoach: sorted(await engine.heldAmong('PLAYER_HEAD_COACH', user('u_head'), players)),
        admin: sorted(await engine.heldAmong('PLATFORM_ADMIN', user('u_admin', 'admin'), teams)),
        adminWithoutRole: sorted(await engine.heldAmong('PLATFORM_ADMIN', user('u_owner'), teams)),
        stranger: sorted(await engine.heldAmong('OWNER', null, events)),
        publicForStranger: sorted(await engine.heldAmong('PUBLIC', null, events)),
        signedInForStranger: sorted(await engine.heldAmong('ANY_SIGNED_IN', null, events)),
        unknownRelation: sorted(await engine.heldAmong('NO_SUCH' as never, user('u_owner'), events)),
        acrossBatches: sorted(await engine.heldAmong('HEAD_COACH', user('u_head'), many)),
        idThatIsSql: sorted(await engine.heldAmong('OWNER', user(`u_owner' OR '1'='1`), [`e_cup' OR '1'='1`, 'e_cup'])),
      },
      holds: {
        owner: await engine.holds('OWNER', user('u_owner'), 'e_cup'),
        ownerOfNothing: await engine.holds('OWNER', user('u_owner'), null),
        coachRoleNeedsNoObject: await engine.holds('ANY_COACH', user('u_any', 'coach'), null),
        playerHeadCoach: await engine.holds('PLAYER_HEAD_COACH', user('u_head'), 'p_now'),
        playerHeadCoachAfterLeaving: await engine.holds('PLAYER_HEAD_COACH', user('u_head'), 'p_left'),
      },
      objectsHeldBy: {
        owner: sorted(await engine.objectsHeldBy('OWNER', 'u_owner')),
        assistantAsHead: sorted(await engine.objectsHeldBy('HEAD_COACH', 'u_assistant')),
        playerNow: sorted(await engine.objectsHeldBy('TEAM_PLAYER', 'u_player')),
        playerLeft: sorted(await engine.objectsHeldBy('TEAM_PLAYER', 'u_left')),
        gameEventOwner: sorted(await engine.objectsHeldBy('GAME_EVENT_OWNER', 'u_owner')),
        playerHeadCoach: sorted(await engine.objectsHeldBy('PLAYER_HEAD_COACH', 'u_head')),
        role: sorted(await engine.objectsHeldBy('PLATFORM_ADMIN', 'u_admin')),
      },
      usersHolding: {
        headCoach: sorted(await engine.usersHolding('HEAD_COACH', 't_red')),
        teamPlayers: sorted(await engine.usersHolding('TEAM_PLAYER', 't_red')),
        gameEventCoOrganizer: sorted(await engine.usersHolding('GAME_EVENT_CO_ORGANIZER', 'g_cup')),
        everyone: sorted(await engine.usersHolding('ANY_SIGNED_IN', 't_red')),
      },
      audience: {
        viewRoster: sorted(await engine.audienceFor('VIEW_ROSTER', 't_red')),
        editPlayer: sorted(await engine.audienceFor('EDIT_PLAYER', 'p_now')),
      },
      can: {
        strangerViewsEvent: await engine.can('VIEW_EVENT', null, 'e_cup'),
        strangerEditsEvent: await engine.can('EDIT_EVENT', null, 'e_cup'),
        strangerFollows: await engine.can('FOLLOW', null, null),
        signedInFollows: await engine.can('FOLLOW', user('u_any'), null),
        ownerEdits: await engine.can('EDIT_EVENT', user('u_owner'), 'e_cup'),
        coOrganizerEdits: await engine.can('EDIT_EVENT', user('u_coorg'), 'e_cup'),
        invitedEdits: await engine.can('EDIT_EVENT', user('u_invited'), 'e_cup'),
        adminEditsAny: await engine.can('EDIT_EVENT', user('u_admin', 'admin'), 'e_camp'),
        nobodyDeletes: await engine.can('DELETE_EVENT', user('u_admin', 'admin'), 'e_cup'),
        unknownAction: await engine.can('NO_SUCH' as never, user('u_admin', 'admin'), 'e_cup'),
        coachCreatesTeam: await engine.can('CREATE_TEAM', user('u_any', 'coach'), null),
        ownerCreatesTeam: await engine.can('CREATE_TEAM', user('u_owner'), null),
        // Narrowed by the event's own subtype.
        bracketsForCup: await engine.can('GENERATE_BRACKETS', user('u_owner'), 'e_cup'),
        bracketsForCamp: await engine.can('GENERATE_BRACKETS', user('u_owner'), 'e_camp'),
        // Narrowed by the subtype of the game's event; the referee's grant is not narrowed.
        ownerScoresCupGame: await engine.can('ENTER_SCORES', user('u_owner'), 'g_cup'),
        ownerScoresCampGame: await engine.can('ENTER_SCORES', user('u_owner'), 'g_camp'),
        refereeScoresCampGame: await engine.can('ENTER_SCORES', user('u_ref'), 'g_camp'),
        // About a pair: the caller names the event.
        coachRegistersForCup: await engine.can('REGISTER_TEAM_FOR_EVENT', user('u_head'), 't_red', 'e_cup'),
        coachRegistersForCamp: await engine.can('REGISTER_TEAM_FOR_EVENT', user('u_head'), 't_red', 'e_camp'),
        coachRegistersForNothing: await engine.can('REGISTER_TEAM_FOR_EVENT', user('u_head'), 't_red'),
      },
      canAll: {
        ownerScores: sorted(await engine.canAll('ENTER_SCORES', user('u_owner'), games)),
        adminEditsTeams: sorted(await engine.canAll('EDIT_TEAM', user('u_admin', 'admin'), teams)),
      },
      canFor: {
        ownerEvents: Object.fromEntries(await engine.canFor('EVENT', user('u_owner'), events)),
        strangerEvents: Object.fromEntries(await engine.canFor('EVENT', null, ['e_cup'])),
        headCoachTeams: Object.fromEntries(await engine.canFor('TEAM', user('u_head'), teams)),
        parentPlayers: Object.fromEntries(await engine.canFor('PLAYER', user('u_parent'), players)),
        headCoachPlayers: Object.fromEntries(await engine.canFor('PLAYER', user('u_head'), players)),
      },
      objects: {
        tableOfEditTeam: engine.objectTableFor('EDIT_TEAM'),
        tableOfCreateTeam: engine.objectTableFor('CREATE_TEAM'),
        teamExists: await engine.objectExists('team', 't_red'),
        teamMissing: await engine.objectExists('team', 't_none'),
        actionsOnTeam: engine.actionsOn('TEAM'),
      },
    });
  },
};
