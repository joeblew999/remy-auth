// The relation engine (.plans/auth-service.md): who may do what is answered by relations, not roles.
// You may edit this team because you coach it, not because you are a coach. An app hands its
// vocabulary over as data (object types, relations with how each is derived, actions, and the grants
// naming the relations that satisfy each action) and the engine answers from the app's own tables in
// its own D1. Nothing is copied into a tuple store, so nothing can drift from the data.
//
// Lifted from remy-sport (src/api/relations.ts, src/api/base.ts, src/domain/grants.ts), keeping its
// row shapes so its vocabulary runs here unchanged. What was remy-sport's own is now the vocabulary's:
// the table-name map, the stored-role map, the relation a stranger holds, and the object type whose
// subtype narrows a grant. Plain JavaScript on D1's own API: no ORM, and loadable by the checks in Node.

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A table or column name, quoted. Names come from the vocabulary, never from a request; anything else is refused. */
function quoted(name) {
  if (typeof name !== 'string' || !NAME.test(name)) throw new Error(`relations: "${name}" is not a table or column name`);
  return `"${name}"`;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * How many ids go into one IN list. SQLite counts every bound parameter against a per-statement
 * limit and D1 enforces it; 90 leaves room for the other bindings a statement carries.
 */
export const MAX_IN = 90;

async function inBatches(ids, read) {
  const batches = [];
  for (let index = 0; index < ids.length; index += MAX_IN) batches.push(ids.slice(index, index + MAX_IN));
  return (await Promise.all(batches.map(read))).flat();
}

const marks = values => values.map(() => '?').join(', ');

/**
 * What is wrong with a vocabulary, one sentence per gap; empty when it holds together: codes are
 * unique, every relation is derived in one of the four ways with the columns that way needs, every
 * inherited relation names a relation that exists and inheritance never loops, and every action and
 * grant names things that exist. An action with no grants is allowed: it permits nobody.
 */
export function vocabularyProblems(vocabulary) {
  const problems = [];
  const { objectTypes = [], relations = [], actions = [], grants = {}, narrow } = vocabulary;
  const types = new Map(objectTypes.map(type => [type.code, type]));
  const byCode = new Map(relations.map(relation => [relation.code, relation]));
  const named = (kind, rows) => {
    const seen = new Set();
    for (const { code } of rows) {
      if (seen.has(code)) problems.push(`${kind} ${code}: defined twice`);
      seen.add(code);
    }
  };
  named('object type', objectTypes);
  named('relation', relations);
  named('action', actions);
  const name = (owner, label, value) => { if (typeof value !== 'string' || !NAME.test(value)) problems.push(`${owner}: ${label} "${value}" is not a table or column name`); };

  for (const type of objectTypes) {
    if (type.tableName) name(`object type ${type.code}`, 'tableName', type.tableName);
    if (type.parentTypeCode) {
      if (!types.has(type.parentTypeCode)) problems.push(`object type ${type.code}: its parent ${type.parentTypeCode} is not an object type`);
      name(`object type ${type.code}`, 'parentColumn', type.parentColumn);
    }
  }
  for (const relation of relations) {
    const owner = `relation ${relation.code}`;
    if (!types.has(relation.objectTypeCode)) problems.push(`${owner}: ${relation.objectTypeCode} is not an object type`);
    if (relation.via === 'table') {
      for (const column of ['sourceTable', 'objectColumn', 'userColumn']) name(owner, column, relation[column]);
      if (relation.throughTable || relation.throughColumn) for (const column of ['throughTable', 'throughColumn']) name(owner, column, relation[column]);
    } else if (relation.via === 'parent') {
      for (const column of ['sourceTable', 'objectColumn', 'throughColumn']) name(owner, column, relation[column]);
      if (!byCode.has(relation.parentRelation)) problems.push(`${owner}: inherits ${relation.parentRelation}, which is not a relation`);
      const seen = new Set([relation.code]);
      for (let next = byCode.get(relation.parentRelation); next?.via === 'parent'; next = byCode.get(next.parentRelation)) {
        if (seen.has(next.code)) { problems.push(`${owner}: its inheritance loops through ${next.code}`); break; }
        seen.add(next.code);
      }
    } else if (relation.via === 'role') {
      if (!relation.roleCode) problems.push(`${owner}: a role relation needs roleCode`);
    } else if (relation.via !== 'everyone') {
      problems.push(`${owner}: via "${relation.via}" is not table, parent, role or everyone`);
    }
    if (relation.via === 'table' || relation.via === 'parent') {
      if (relation.filterColumn) name(owner, 'filterColumn', relation.filterColumn);
      if (Boolean(relation.filterColumn) !== (relation.filterValue !== undefined && relation.filterValue !== null)) problems.push(`${owner}: filterColumn and filterValue go together`);
      for (const column of ['activeFromColumn', 'activeToColumn']) if (relation[column]) name(owner, column, relation[column]);
    }
  }
  const actionCodes = new Set(actions.map(action => action.code));
  for (const action of actions) {
    if (!types.has(action.objectTypeCode)) problems.push(`action ${action.code}: ${action.objectTypeCode} is not an object type`);
    for (const grant of grants[action.code] ?? []) {
      const relation = byCode.get(grant.relation);
      if (!relation) { problems.push(`action ${action.code}: granted to ${grant.relation}, which is not a relation`); continue; }
      const platform = !types.get(relation.objectTypeCode)?.tableName;
      if (!platform && relation.objectTypeCode !== action.objectTypeCode) problems.push(`action ${action.code}: acts on ${action.objectTypeCode} but is granted to ${grant.relation}, a relation on ${relation.objectTypeCode}`);
    }
  }
  for (const code of Object.keys(grants)) if (!actionCodes.has(code)) problems.push(`grants: ${code} is not an action`);
  if (narrow) {
    if (!types.get(narrow.objectTypeCode)?.tableName) problems.push(`narrow: ${narrow.objectTypeCode} is not an object type with a table`);
    name('narrow', 'column', narrow.column);
  }
  return problems;
}

/**
 * What the vocabulary names that the database does not have, one sentence each. `columnsOf(table)`
 * answers a table's column names, or nothing when there is no such table; a check gives it the schema
 * its migrations build. The vocabulary and the schema are two descriptions of one thing, and a
 * relation that names a missing column would otherwise fail closed in production, looking like data.
 */
export function schemaProblems(vocabulary, columnsOf) {
  const problems = [];
  const table = name => vocabulary.tables?.[name] ?? name;
  const need = (owner, tableName, columns) => {
    const found = columnsOf(table(tableName));
    if (!found) { problems.push(`${owner}: no table ${table(tableName)}`); return; }
    for (const column of columns.filter(Boolean)) if (!found.includes(column)) problems.push(`${owner}: ${table(tableName)} has no column ${column}`);
  };
  for (const type of vocabulary.objectTypes) if (type.tableName) need(`object type ${type.code}`, type.tableName, ['id', type.parentColumn]);
  for (const relation of vocabulary.relations) {
    const owner = `relation ${relation.code}`;
    const shared = [relation.filterColumn, relation.activeFromColumn, relation.activeToColumn];
    if (relation.via === 'table' && relation.throughTable) {
      need(owner, relation.sourceTable, [relation.objectColumn, relation.throughColumn, ...shared]);
      need(owner, relation.throughTable, ['id', relation.userColumn]);
    } else if (relation.via === 'table') {
      need(owner, relation.sourceTable, [relation.objectColumn, relation.userColumn, ...shared]);
    } else if (relation.via === 'parent') {
      need(owner, relation.sourceTable, [relation.objectColumn, relation.throughColumn, ...shared]);
    }
  }
  if (vocabulary.narrow) need('narrow', vocabulary.objectTypes.find(type => type.code === vocabulary.narrow.objectTypeCode)?.tableName ?? vocabulary.narrow.objectTypeCode, [vocabulary.narrow.column]);
  return problems;
}

/** The vocabulary itself, refused when it does not hold together (`vocabularyProblems`). */
export function defineVocabulary(vocabulary) {
  const problems = vocabularyProblems(vocabulary);
  if (problems.length) throw new Error(`relations: the vocabulary has ${problems.length} problem(s):\n${problems.map(problem => `  ${problem}`).join('\n')}`);
  return vocabulary;
}

/**
 * The engine for one vocabulary over one D1 database. Every answer is derived from the app's own
 * rows at the moment it is asked; nothing is cached. It fails closed: an unknown relation or action,
 * an action with no grants, and a stranger asking about anything but what everyone holds, are all no.
 */
export function relationEngine(vocabulary, db) {
  const { objectTypes, relations, actions, grants } = defineVocabulary(vocabulary);
  const publicRelation = vocabulary.publicRelation ?? 'PUBLIC';
  const narrow = vocabulary.narrow;
  const narrowField = narrow?.grantField ?? 'subtypes';
  const relationOf = new Map(relations.map(relation => [relation.code, relation]));
  const typeOf = new Map(objectTypes.map(type => [type.code, type]));
  const actionOf = new Map(actions.map(action => [action.code, action]));
  const table = name => quoted(vocabulary.tables?.[name] ?? name);
  const storedRole = code => vocabulary.roles?.[code] ?? code;
  const grantsOf = action => grants[action] ?? [];
  const narrows = grant => grant[narrowField]?.length > 0;
  const all = async (sql, params = []) => (await db.prepare(sql).bind(...params).all()).results;

  /** Does the session alone hold this relation? A stranger holds only the public one. */
  function holdsPlatform(relation, user) {
    if (relation.via === 'role') return Boolean(user?.id) && user.role === storedRole(relation.roleCode);
    if (relation.via === 'everyone') return relation.code === publicRelation || Boolean(user?.id);
    return false;
  }

  /** Every relation the session holds with no object and no query. */
  const platformRelations = user => new Set(relations.filter(relation => holdsPlatform(relation, user)).map(relation => relation.code));

  /** The row filter and the dates a relation is held between, in every direction it is asked. */
  function sourceConditions(relation, source) {
    const sql = [];
    const params = [];
    if (relation.filterColumn) { sql.push(`${source}.${quoted(relation.filterColumn)} = ?`); params.push(relation.filterValue); }
    if (relation.activeFromColumn) { sql.push(`${source}.${quoted(relation.activeFromColumn)} <= ?`); params.push(today()); }
    if (relation.activeToColumn) {
      const to = `${source}.${quoted(relation.activeToColumn)}`;
      sql.push(`(${to} IS NULL OR ${to} >= ?)`);
      params.push(today());
    }
    return { sql, params };
  }

  /** The FROM clause of a table relation and the column holding the user: the row itself, or the entity it points at. */
  function tableSource(relation) {
    const source = table(relation.sourceTable);
    if (!relation.throughTable) return { source, from: source, userSide: `${source}.${quoted(relation.userColumn)}` };
    const through = table(relation.throughTable);
    return { source, from: `${source} JOIN ${through} ON ${through}."id" = ${source}.${quoted(relation.throughColumn)}`, userSide: `${through}.${quoted(relation.userColumn)}` };
  }

  /**
   * Which of these objects does the user hold this relation on? Per relation, never per object: one
   * query for a table relation, two for an inherited one, whether three ids are asked or three hundred.
   */
  async function heldAmong(relationCode, user, objectIds) {
    const relation = relationOf.get(relationCode);
    if (!relation || objectIds.length === 0) return new Set();
    if (relation.via === 'everyone' || relation.via === 'role') return holdsPlatform(relation, user) ? new Set(objectIds) : new Set();
    // A stranger has a row in no table.
    if (!user?.id) return new Set();

    if (relation.via === 'parent') {
      const source = table(relation.sourceTable);
      const object = `${source}.${quoted(relation.objectColumn)}`;
      const conditions = sourceConditions(relation, source);
      const rows = await inBatches(objectIds, batch => all(
        `SELECT ${object} AS "id", ${source}.${quoted(relation.throughColumn)} AS "parent" FROM ${source} WHERE ${[`${object} IN (${marks(batch)})`, ...conditions.sql].join(' AND ')}`,
        [...batch, ...conditions.params]));
      const parents = [...new Set(rows.map(row => row.parent).filter(Boolean))];
      if (parents.length === 0) return new Set();
      const heldParents = await heldAmong(relation.parentRelation, user, parents);
      return new Set(rows.filter(row => row.parent && heldParents.has(row.parent)).map(row => row.id));
    }

    const { source, from, userSide } = tableSource(relation);
    const object = `${source}.${quoted(relation.objectColumn)}`;
    const conditions = sourceConditions(relation, source);
    const rows = await inBatches(objectIds, batch => all(
      `SELECT DISTINCT ${object} AS "objectId" FROM ${from} WHERE ${[`${object} IN (${marks(batch)})`, `${userSide} = ?`, ...conditions.sql].join(' AND ')}`,
      [...batch, user.id, ...conditions.params]));
    return new Set(rows.map(row => row.objectId));
  }

  /** Does this user hold this relation? `objectId` is ignored for a platform relation. */
  async function holds(relationCode, user, objectId) {
    const relation = relationOf.get(relationCode);
    if (!relation) return false;
    if (relation.via === 'everyone' || relation.via === 'role') return holdsPlatform(relation, user);
    if (!objectId) return false;
    return (await heldAmong(relationCode, user, [objectId])).has(objectId);
  }

  /** The other way round: which objects does this user hold the relation on? Empty for a platform relation. */
  async function objectsHeldBy(relationCode, userId) {
    const relation = relationOf.get(relationCode);
    if (!relation || !userId) return [];
    if (relation.via === 'parent') {
      const parents = await objectsHeldBy(relation.parentRelation, userId);
      if (parents.length === 0) return [];
      const source = table(relation.sourceTable);
      const conditions = sourceConditions(relation, source);
      const rows = await inBatches(parents, batch => all(
        `SELECT DISTINCT ${source}.${quoted(relation.objectColumn)} AS "objectId" FROM ${source} WHERE ${[`${source}.${quoted(relation.throughColumn)} IN (${marks(batch)})`, ...conditions.sql].join(' AND ')}`,
        [...batch, ...conditions.params]));
      return [...new Set(rows.map(row => row.objectId))];
    }
    if (relation.via !== 'table') return [];
    const { source, from, userSide } = tableSource(relation);
    const conditions = sourceConditions(relation, source);
    const rows = await all(
      `SELECT DISTINCT ${source}.${quoted(relation.objectColumn)} AS "objectId" FROM ${from} WHERE ${[`${userSide} = ?`, ...conditions.sql].join(' AND ')}`,
      [userId, ...conditions.params]);
    return rows.map(row => row.objectId);
  }

  /** The inverse: everyone who holds this relation on this object. Only relations with a bounded set of people answer. */
  async function usersHolding(relationCode, objectId) {
    const relation = relationOf.get(relationCode);
    if (!relation) return [];
    if (relation.via === 'parent') {
      const source = table(relation.sourceTable);
      const conditions = sourceConditions(relation, source);
      const rows = await all(
        `SELECT DISTINCT ${source}.${quoted(relation.throughColumn)} AS "parent" FROM ${source} WHERE ${[`${source}.${quoted(relation.objectColumn)} = ?`, ...conditions.sql].join(' AND ')}`,
        [objectId, ...conditions.params]);
      const found = await Promise.all(rows.filter(row => row.parent).map(row => usersHolding(relation.parentRelation, row.parent)));
      return [...new Set(found.flat())];
    }
    if (relation.via !== 'table') return [];
    const { source, from, userSide } = tableSource(relation);
    const conditions = sourceConditions(relation, source);
    const rows = await all(
      `SELECT DISTINCT ${userSide} AS "userId" FROM ${from} WHERE ${[`${source}.${quoted(relation.objectColumn)} = ?`, ...conditions.sql, `${userSide} IS NOT NULL`].join(' AND ')}`,
      [objectId, ...conditions.params]);
    return rows.map(row => row.userId);
  }

  /** Everyone the vocabulary says may take `action` on `objectId`: the union of the people holding any relation it is granted to. */
  async function audienceFor(action, objectId) {
    const found = await Promise.all(grantsOf(action).map(grant => usersHolding(grant.relation, objectId)));
    return [...new Set(found.flat())];
  }

  /** The table an action's object lives in, or null for a platform action (nothing exists yet to be in a relation to). */
  function objectTableFor(action) {
    const type = typeOf.get(actionOf.get(action)?.objectTypeCode);
    return type?.tableName ? vocabulary.tables?.[type.tableName] ?? type.tableName : null;
  }

  /** Does a row with this id exist in that table? A missing object is a 404, not a 403. */
  async function objectExists(tableName, id) {
    return (await all(`SELECT 1 AS "ok" FROM ${quoted(tableName)} WHERE "id" = ? LIMIT 1`, [id])).length > 0;
  }

  /**
   * The subtype of each object, for the grants that narrow by it: the object's own when its type is
   * the narrowing one, its parent's when that is. `context` names the narrowing object for an action
   * about a pair, which no single row can answer.
   */
  async function subtypesFor(objectType, ids, context) {
    const none = new Map(ids.map(id => [id, null]));
    if (!narrow) return none;
    const type = typeOf.get(objectType);
    let narrowing;
    if (context !== undefined) narrowing = new Map(ids.map(id => [id, context]));
    else if (type?.code === narrow.objectTypeCode) narrowing = new Map(ids.map(id => [id, id]));
    else if (type?.parentTypeCode === narrow.objectTypeCode && type.tableName) {
      const source = table(type.tableName);
      const rows = await inBatches(ids, batch => all(`SELECT ${source}."id" AS "id", ${source}.${quoted(type.parentColumn)} AS "parent" FROM ${source} WHERE ${source}."id" IN (${marks(batch)})`, batch));
      narrowing = new Map(rows.map(row => [row.id, row.parent]));
    } else return none;
    const wanted = [...new Set([...narrowing.values()].filter(Boolean))];
    if (wanted.length === 0) return none;
    const source = table(typeOf.get(narrow.objectTypeCode).tableName);
    const rows = await inBatches(wanted, batch => all(`SELECT ${source}."id" AS "id", ${source}.${quoted(narrow.column)} AS "subtype" FROM ${source} WHERE ${source}."id" IN (${marks(batch)})`, batch));
    const subtypes = new Map(rows.map(row => [row.id, row.subtype]));
    return new Map(ids.map(id => [id, subtypes.get(narrowing.get(id)) ?? null]));
  }

  /** Does any grant of this action name a relation held, within the subtype where the grant applies? */
  const grantAllows = (action, held, subtype) => grantsOf(action).some(grant =>
    held.has(grant.relation) && (!narrows(grant) || (subtype !== null && grant[narrowField].includes(subtype))));

  /** Which of these relations the viewer holds on each object: platform ones from the session, each other one in a single read. */
  async function relationsHeld(user, wanted, ids) {
    const platform = platformRelations(user);
    const onObjects = wanted.filter(relation => relation.via === 'table' || relation.via === 'parent');
    const sets = await Promise.all(onObjects.map(relation => heldAmong(relation.code, user, ids)));
    return new Map(ids.map(id => {
      const held = new Set(platform);
      onObjects.forEach((relation, index) => { if (sets[index].has(id)) held.add(relation.code); });
      return [id, held];
    }));
  }

  /** Which of these objects may the user take this action on? The list form, and the one that does the work. */
  async function canAll(action, user, objectIds, context) {
    const granted = grantsOf(action);
    if (granted.length === 0 || objectIds.length === 0) return new Set();
    const ids = [...new Set(objectIds)];
    // A platform grant with nothing to narrow it is true for every object and touches no table.
    if (grantAllows(action, platformRelations(user), null)) return new Set(ids);
    const subtypes = granted.some(narrows) ? await subtypesFor(actionOf.get(action)?.objectTypeCode, ids, context) : new Map();
    const held = await relationsHeld(user, relations.filter(relation => granted.some(grant => grant.relation === relation.code)), ids);
    return new Set(ids.filter(id => grantAllows(action, held.get(id), subtypes.get(id) ?? null)));
  }

  /** May this user take this action on this object? `objectId` is null for a platform action. */
  async function can(action, user, objectId, context) {
    if (!objectId) return grantAllows(action, platformRelations(user), null);
    return (await canAll(action, user, [objectId], context)).has(objectId);
  }

  /** An action about a pair: narrowed by a subtype its own object neither is nor sits under. Only its caller knows the other half. */
  const isPairAction = action => Boolean(narrow) && Boolean(typeOf.get(action.objectTypeCode)?.tableName)
    && action.objectTypeCode !== narrow.objectTypeCode && typeOf.get(action.objectTypeCode)?.parentTypeCode !== narrow.objectTypeCode
    && grantsOf(action.code).some(narrows);

  /** The actions a row of this type answers for its viewer. */
  const actionsOn = objectType => actions.filter(action => action.objectTypeCode === objectType && !isPairAction(action)).map(action => action.code);

  /**
   * Every action a row of this type answers, for a whole list: what a screen receives with its data.
   * The cost is per relation of the type, not per action or per row.
   */
  async function canFor(objectType, user, objectIds) {
    const ids = [...new Set(objectIds)];
    if (ids.length === 0) return new Map();
    const own = actionsOn(objectType);
    const [subtypes, held] = await Promise.all([
      own.some(action => grantsOf(action).some(narrows)) ? subtypesFor(objectType, ids) : new Map(),
      relationsHeld(user, relations.filter(relation => relation.objectTypeCode === objectType), ids),
    ]);
    return new Map(ids.map(id => [id, Object.fromEntries(own.map(action => [action, grantAllows(action, held.get(id), subtypes.get(id) ?? null)]))]));
  }

  return { vocabulary, holds, heldAmong, objectsHeldBy, usersHolding, audienceFor, objectTableFor, objectExists, can, canAll, canFor, actionsOn, platformRelations };
}
