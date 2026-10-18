// The relation engine (issue #38): who may do what is answered by relations, not roles.
// You may edit this team because you coach it, not because you are a coach. An app hands its
// vocabulary over as data (object types, relations with how each is derived, actions, and the grants
// naming the relations that satisfy each action) and the engine answers from the app's own tables in
// its own D1. Nothing is copied into a tuple store, so nothing can drift from the data.
//
// Lifted from remy-sport (src/api/relations.ts, src/api/base.ts, src/domain/grants.ts), keeping its
// row shapes so its vocabulary runs here unchanged. What was remy-sport's own is now the vocabulary's:
// the table-name map, the stored-role map, the relation a stranger holds, and the object type whose
// subtype narrows a grant. On D1's own API: no ORM, and packed (vite.config.ts), so the checks load it in Node.

/** A kind of thing people stand in relations to. No `tableName`: the platform itself, which has no rows. */
export type ObjectTypeRow = {
  code: string;
  tableName?: string | null;
  /** The type one step up, and the column on this type's table that points at it. */
  parentTypeCode?: string | null;
  parentColumn?: string | null;
};

/**
 * A relation and how it is derived, as columns rather than prose:
 * - `table`: a row in `sourceTable` links `userColumn` to `objectColumn`, optionally only rows whose
 *   `filterColumn` is `filterValue`, optionally reaching the user through another entity
 *   (`throughTable` by `throughColumn`), optionally only between `activeFromColumn` and `activeToColumn`;
 * - `parent`: held through the object's parent (`throughColumn` on `sourceTable`), as `parentRelation` there;
 * - `role`: the user's platform role is `roleCode`;
 * - `everyone`: no condition (the vocabulary's `publicRelation` for anyone at all, any other for anyone signed in).
 */
export type RelationRow = {
  code: string;
  objectTypeCode: string;
  via: 'table' | 'parent' | 'role' | 'everyone';
  sourceTable?: string | null;
  objectColumn?: string | null;
  userColumn?: string | null;
  filterColumn?: string | null;
  filterValue?: string | null;
  throughTable?: string | null;
  throughColumn?: string | null;
  activeFromColumn?: string | null;
  activeToColumn?: string | null;
  roleCode?: string | null;
  parentRelation?: string | null;
};

export type ActionRow = { code: string; objectTypeCode: string };
/** A relation that satisfies an action, optionally only for some subtypes of the narrowing object (`narrow`). */
export type Grant = { relation: string } & Record<string, unknown>;

/** An app's relation vocabulary, as data. Declare it `as const` so its codes are types. */
export type Vocabulary = {
  objectTypes: readonly ObjectTypeRow[];
  relations: readonly RelationRow[];
  actions: readonly ActionRow[];
  /** For each action, the relations that satisfy it; any one is enough. None: nobody may. */
  grants: Readonly<Record<string, readonly Grant[]>>;
  /** The `everyone` relation a stranger holds. Default "PUBLIC". */
  publicRelation?: string;
  /** What the session's `role` holds for each `roleCode`, where they differ. */
  roles?: Readonly<Record<string, string>>;
  /** The SQL table behind each table name the rows use, where they differ. */
  tables?: Readonly<Record<string, string>>;
  /** Grants may apply to some subtypes only: the object type whose `column` is the subtype, and the grant field listing them (default "subtypes"). */
  narrow?: { objectTypeCode: string; column: string; grantField?: string };
};

export type ActionCode<V extends Vocabulary> = V['actions'][number]['code'];
export type RelationCode<V extends Vocabulary> = V['relations'][number]['code'];
export type ObjectTypeCode<V extends Vocabulary> = V['objectTypes'][number]['code'];
/** The actions the vocabulary declares on one object type. */
export type ActionOn<V extends Vocabulary, T extends string> = Extract<
  V['actions'][number],
  { objectTypeCode: T }
>['code'];
/** What a row of this type carries for its viewer: each of its actions, allowed or not. */
export type Can<V extends Vocabulary, T extends string> = Record<ActionOn<V, T>, boolean>;

/** Who is asking: the session's user, or null for a stranger. */
export type Viewer = { id: string; role?: string | null } | null | undefined;

/** The part of D1's API the engine uses. */
export type RelationsDatabase = {
  prepare(query: string): { bind(...values: unknown[]): { all(): Promise<{ results: any[] }> } };
};

export type RelationEngine<V extends Vocabulary> = {
  vocabulary: V;
  /** Does this user hold this relation on this object? `objectId` is ignored for a platform relation. */
  holds(relation: RelationCode<V>, user: Viewer, objectId: string | null): Promise<boolean>;
  /** Which of these objects the user holds the relation on: one or two queries however many ids. */
  heldAmong(relation: RelationCode<V>, user: Viewer, objectIds: readonly string[]): Promise<Set<string>>;
  /** Every object this user holds the relation on: the "yours" list. */
  objectsHeldBy(relation: RelationCode<V>, userId: string): Promise<string[]>;
  /** Everyone who holds the relation on this object. */
  usersHolding(relation: RelationCode<V>, objectId: string): Promise<string[]>;
  /** Everyone who may take the action on this object. */
  audienceFor(action: ActionCode<V>, objectId: string): Promise<string[]>;
  /** The SQL table an action's object lives in, or null for a platform action. */
  objectTableFor(action: ActionCode<V>): string | null;
  objectExists(table: string, id: string): Promise<boolean>;
  /** May this user take this action on this object (null: a platform action)? `context` names the narrowing object for an action about a pair. */
  can(action: ActionCode<V>, user: Viewer, objectId: string | null, context?: string | null): Promise<boolean>;
  /** Which of these objects the user may take the action on. */
  canAll(
    action: ActionCode<V>,
    user: Viewer,
    objectIds: readonly string[],
    context?: string | null,
  ): Promise<Set<string>>;
  /** For a whole list: each row's actions, allowed or not. What a screen receives with its data. */
  canFor<T extends ObjectTypeCode<V>>(
    objectType: T,
    user: Viewer,
    objectIds: readonly string[],
  ): Promise<Map<string, Can<V, T>>>;
  /** The actions a row of this type answers. */
  actionsOn<T extends ObjectTypeCode<V>>(objectType: T): ActionOn<V, T>[];
  platformRelations(user: Viewer): Set<RelationCode<V>>;
};

/** A code as a row may carry it: absent on some rows. */
type Code = string | null | undefined;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A table or column name, quoted. Names come from the vocabulary, never from a request; anything else is refused. */
function quoted(name: unknown): string {
  if (typeof name !== 'string' || !NAME.test(name))
    throw new Error(`relations: "${String(name)}" is not a table or column name`);
  return `"${name}"`;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * How many ids go into one IN list. SQLite counts every bound parameter against a per-statement
 * limit and D1 enforces it; 90 leaves room for the other bindings a statement carries.
 */
export const MAX_IN: number = 90;

async function inBatches<T>(ids: readonly T[], read: (batch: T[]) => Promise<any[]>): Promise<any[]> {
  const batches: T[][] = [];
  for (let index = 0; index < ids.length; index += MAX_IN) batches.push(ids.slice(index, index + MAX_IN));
  return (await Promise.all(batches.map(read))).flat();
}

const marks = (values: readonly unknown[]): string => values.map(() => '?').join(', ');

/**
 * What is wrong with a vocabulary, one sentence per gap; empty when it holds together: codes are
 * unique, every relation is derived in one of the four ways with the columns that way needs, every
 * inherited relation names a relation that exists and inheritance never loops, and every action and
 * grant names things that exist. An action with no grants is allowed: it permits nobody.
 */
export function vocabularyProblems(vocabulary: Vocabulary): string[] {
  const problems: string[] = [];
  // Partial: a vocabulary written in JavaScript may leave a list out, which the defaults cover.
  const { objectTypes = [], relations = [], actions = [], grants = {}, narrow } = vocabulary as Partial<Vocabulary>;
  const types = new Map<Code, ObjectTypeRow>(objectTypes.map((type) => [type.code, type]));
  const byCode = new Map<Code, RelationRow>(relations.map((relation) => [relation.code, relation]));
  const named = (kind: string, rows: readonly { code: string }[]) => {
    const seen = new Set<string>();
    for (const { code } of rows) {
      if (seen.has(code)) problems.push(`${kind} ${code}: defined twice`);
      seen.add(code);
    }
  };
  named('object type', objectTypes);
  named('relation', relations);
  named('action', actions);
  const name = (owner: string, label: string, value: unknown) => {
    if (typeof value !== 'string' || !NAME.test(value))
      problems.push(`${owner}: ${label} "${String(value)}" is not a table or column name`);
  };

  for (const type of objectTypes) {
    if (type.tableName) name(`object type ${type.code}`, 'tableName', type.tableName);
    if (type.parentTypeCode) {
      if (!types.has(type.parentTypeCode))
        problems.push(`object type ${type.code}: its parent ${type.parentTypeCode} is not an object type`);
      name(`object type ${type.code}`, 'parentColumn', type.parentColumn);
    }
  }
  for (const relation of relations) {
    const owner = `relation ${relation.code}`;
    if (!types.has(relation.objectTypeCode))
      problems.push(`${owner}: ${relation.objectTypeCode} is not an object type`);
    if (relation.via === 'table') {
      for (const column of ['sourceTable', 'objectColumn', 'userColumn'] as const)
        name(owner, column, relation[column]);
      if (relation.throughTable || relation.throughColumn)
        for (const column of ['throughTable', 'throughColumn'] as const) name(owner, column, relation[column]);
    } else if (relation.via === 'parent') {
      for (const column of ['sourceTable', 'objectColumn', 'throughColumn'] as const)
        name(owner, column, relation[column]);
      if (!byCode.has(relation.parentRelation))
        problems.push(`${owner}: inherits ${relation.parentRelation}, which is not a relation`);
      const seen = new Set<string>([relation.code]);
      for (
        let next = byCode.get(relation.parentRelation);
        next?.via === 'parent';
        next = byCode.get(next.parentRelation)
      ) {
        if (seen.has(next.code)) {
          problems.push(`${owner}: its inheritance loops through ${next.code}`);
          break;
        }
        seen.add(next.code);
      }
    } else if (relation.via === 'role') {
      if (!relation.roleCode) problems.push(`${owner}: a role relation needs roleCode`);
    } else if (relation.via !== 'everyone') {
      problems.push(`${owner}: via "${String(relation.via)}" is not table, parent, role or everyone`);
    }
    if (relation.via === 'table' || relation.via === 'parent') {
      if (relation.filterColumn) name(owner, 'filterColumn', relation.filterColumn);
      if (Boolean(relation.filterColumn) !== (relation.filterValue !== undefined && relation.filterValue !== null))
        problems.push(`${owner}: filterColumn and filterValue go together`);
      for (const column of ['activeFromColumn', 'activeToColumn'] as const)
        if (relation[column]) name(owner, column, relation[column]);
    }
  }
  const actionCodes = new Set(actions.map((action) => action.code));
  for (const action of actions) {
    if (!types.has(action.objectTypeCode))
      problems.push(`action ${action.code}: ${action.objectTypeCode} is not an object type`);
    for (const grant of grants[action.code] ?? []) {
      const relation = byCode.get(grant.relation);
      if (!relation) {
        problems.push(`action ${action.code}: granted to ${grant.relation}, which is not a relation`);
        continue;
      }
      const platform = !types.get(relation.objectTypeCode)?.tableName;
      if (!platform && relation.objectTypeCode !== action.objectTypeCode)
        problems.push(
          `action ${action.code}: acts on ${action.objectTypeCode} but is granted to ${grant.relation}, a relation on ${relation.objectTypeCode}`,
        );
    }
  }
  for (const code of Object.keys(grants)) if (!actionCodes.has(code)) problems.push(`grants: ${code} is not an action`);
  if (narrow) {
    if (!types.get(narrow.objectTypeCode)?.tableName)
      problems.push(`narrow: ${narrow.objectTypeCode} is not an object type with a table`);
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
export function schemaProblems(
  vocabulary: Vocabulary,
  columnsOf: (table: string) => readonly string[] | undefined,
): string[] {
  const problems: string[] = [];
  const table = (name: string): string => vocabulary.tables?.[name] ?? name;
  const need = (owner: string, tableName: string, columns: readonly Code[]) => {
    const found = columnsOf(table(tableName));
    if (!found) {
      problems.push(`${owner}: no table ${table(tableName)}`);
      return;
    }
    for (const column of columns.filter(Boolean))
      if (!found.includes(column as string)) problems.push(`${owner}: ${table(tableName)} has no column ${column}`);
  };
  for (const type of vocabulary.objectTypes)
    if (type.tableName) need(`object type ${type.code}`, type.tableName, ['id', type.parentColumn]);
  for (const relation of vocabulary.relations) {
    const owner = `relation ${relation.code}`;
    const shared = [relation.filterColumn, relation.activeFromColumn, relation.activeToColumn];
    if (relation.via === 'table' && relation.throughTable) {
      need(owner, relation.sourceTable!, [relation.objectColumn, relation.throughColumn, ...shared]);
      need(owner, relation.throughTable, ['id', relation.userColumn]);
    } else if (relation.via === 'table') {
      need(owner, relation.sourceTable!, [relation.objectColumn, relation.userColumn, ...shared]);
    } else if (relation.via === 'parent') {
      need(owner, relation.sourceTable!, [relation.objectColumn, relation.throughColumn, ...shared]);
    }
  }
  if (vocabulary.narrow)
    need(
      'narrow',
      vocabulary.objectTypes.find((type) => type.code === vocabulary.narrow!.objectTypeCode)?.tableName ??
        vocabulary.narrow.objectTypeCode,
      [vocabulary.narrow.column],
    );
  return problems;
}

/** The vocabulary itself, refused when it does not hold together (`vocabularyProblems`). */
export function defineVocabulary<const V extends Vocabulary>(vocabulary: V): V {
  const problems = vocabularyProblems(vocabulary);
  if (problems.length)
    throw new Error(
      `relations: the vocabulary has ${problems.length} problem(s):\n${problems.map((problem) => `  ${problem}`).join('\n')}`,
    );
  return vocabulary;
}

/**
 * The engine for one vocabulary over one D1 database. Every answer is derived from the app's own
 * rows at the moment it is asked; nothing is cached. It fails closed: an unknown relation or action,
 * an action with no grants, and a stranger asking about anything but what everyone holds, are all no.
 */
export function relationEngine<const V extends Vocabulary>(vocabulary: V, db: RelationsDatabase): RelationEngine<V> {
  const { objectTypes, relations, actions, grants }: Vocabulary = defineVocabulary(vocabulary);
  const publicRelation = vocabulary.publicRelation ?? 'PUBLIC';
  const narrow = vocabulary.narrow;
  const narrowField = narrow?.grantField ?? 'subtypes';
  const relationOf = new Map<Code, RelationRow>(relations.map((relation) => [relation.code, relation]));
  const typeOf = new Map<Code, ObjectTypeRow>(objectTypes.map((type) => [type.code, type]));
  const actionOf = new Map<Code, ActionRow>(actions.map((action) => [action.code, action]));
  const table = (name: Code): string => quoted(vocabulary.tables?.[name as string] ?? name);
  const storedRole = (code: Code): Code => vocabulary.roles?.[code as string] ?? code;
  const grantsOf = (action: string): readonly Grant[] => grants[action] ?? [];
  const narrows = (grant: Grant): boolean => ((grant[narrowField] as readonly unknown[] | undefined)?.length ?? 0) > 0;
  const all = async (sql: string, params: readonly unknown[] = []): Promise<any[]> =>
    (
      await db
        .prepare(sql)
        .bind(...params)
        .all()
    ).results;

  /** Does the session alone hold this relation? A stranger holds only the public one. */
  function holdsPlatform(relation: RelationRow, user: Viewer): boolean {
    if (relation.via === 'role') return Boolean(user?.id) && user!.role === storedRole(relation.roleCode);
    if (relation.via === 'everyone') return relation.code === publicRelation || Boolean(user?.id);
    return false;
  }

  /** Every relation the session holds with no object and no query. */
  const platformRelations = (user: Viewer): Set<string> =>
    new Set(relations.filter((relation) => holdsPlatform(relation, user)).map((relation) => relation.code));

  /** The row filter and the dates a relation is held between, in every direction it is asked. */
  function sourceConditions(relation: RelationRow, source: string): { sql: string[]; params: unknown[] } {
    const sql: string[] = [];
    const params: unknown[] = [];
    if (relation.filterColumn) {
      sql.push(`${source}.${quoted(relation.filterColumn)} = ?`);
      params.push(relation.filterValue);
    }
    if (relation.activeFromColumn) {
      sql.push(`${source}.${quoted(relation.activeFromColumn)} <= ?`);
      params.push(today());
    }
    if (relation.activeToColumn) {
      const to = `${source}.${quoted(relation.activeToColumn)}`;
      sql.push(`(${to} IS NULL OR ${to} >= ?)`);
      params.push(today());
    }
    return { sql, params };
  }

  /** The FROM clause of a table relation and the column holding the user: the row itself, or the entity it points at. */
  function tableSource(relation: RelationRow): { source: string; from: string; userSide: string } {
    const source = table(relation.sourceTable);
    if (!relation.throughTable) return { source, from: source, userSide: `${source}.${quoted(relation.userColumn)}` };
    const through = table(relation.throughTable);
    return {
      source,
      from: `${source} JOIN ${through} ON ${through}."id" = ${source}.${quoted(relation.throughColumn)}`,
      userSide: `${through}.${quoted(relation.userColumn)}`,
    };
  }

  /**
   * Which of these objects does the user hold this relation on? Per relation, never per object: one
   * query for a table relation, two for an inherited one, whether three ids are asked or three hundred.
   */
  async function heldAmong(relationCode: Code, user: Viewer, objectIds: readonly string[]): Promise<Set<string>> {
    const relation = relationOf.get(relationCode);
    if (!relation || objectIds.length === 0) return new Set();
    if (relation.via === 'everyone' || relation.via === 'role')
      return holdsPlatform(relation, user) ? new Set(objectIds) : new Set();
    // A stranger has a row in no table.
    if (!user?.id) return new Set();

    if (relation.via === 'parent') {
      const source = table(relation.sourceTable);
      const object = `${source}.${quoted(relation.objectColumn)}`;
      const conditions = sourceConditions(relation, source);
      const rows = await inBatches(objectIds, (batch) =>
        all(
          `SELECT ${object} AS "id", ${source}.${quoted(relation.throughColumn)} AS "parent" FROM ${source} WHERE ${[`${object} IN (${marks(batch)})`, ...conditions.sql].join(' AND ')}`,
          [...batch, ...conditions.params],
        ),
      );
      const parents: string[] = [...new Set(rows.map((row) => row.parent).filter(Boolean))];
      if (parents.length === 0) return new Set();
      const heldParents = await heldAmong(relation.parentRelation, user, parents);
      return new Set(rows.filter((row) => row.parent && heldParents.has(row.parent)).map((row) => row.id));
    }

    const { source, from, userSide } = tableSource(relation);
    const object = `${source}.${quoted(relation.objectColumn)}`;
    const conditions = sourceConditions(relation, source);
    const rows = await inBatches(objectIds, (batch) =>
      all(
        `SELECT DISTINCT ${object} AS "objectId" FROM ${from} WHERE ${[`${object} IN (${marks(batch)})`, `${userSide} = ?`, ...conditions.sql].join(' AND ')}`,
        [...batch, user.id, ...conditions.params],
      ),
    );
    return new Set(rows.map((row) => row.objectId));
  }

  /** Does this user hold this relation? `objectId` is ignored for a platform relation. */
  async function holds(relationCode: string, user: Viewer, objectId: string | null): Promise<boolean> {
    const relation = relationOf.get(relationCode);
    if (!relation) return false;
    if (relation.via === 'everyone' || relation.via === 'role') return holdsPlatform(relation, user);
    if (!objectId) return false;
    return (await heldAmong(relationCode, user, [objectId])).has(objectId);
  }

  /** The other way round: which objects does this user hold the relation on? Empty for a platform relation. */
  async function objectsHeldBy(relationCode: Code, userId: string): Promise<string[]> {
    const relation = relationOf.get(relationCode);
    if (!relation || !userId) return [];
    if (relation.via === 'parent') {
      const parents = await objectsHeldBy(relation.parentRelation, userId);
      if (parents.length === 0) return [];
      const source = table(relation.sourceTable);
      const conditions = sourceConditions(relation, source);
      const rows = await inBatches(parents, (batch) =>
        all(
          `SELECT DISTINCT ${source}.${quoted(relation.objectColumn)} AS "objectId" FROM ${source} WHERE ${[`${source}.${quoted(relation.throughColumn)} IN (${marks(batch)})`, ...conditions.sql].join(' AND ')}`,
          [...batch, ...conditions.params],
        ),
      );
      return [...new Set(rows.map((row) => row.objectId))];
    }
    if (relation.via !== 'table') return [];
    const { source, from, userSide } = tableSource(relation);
    const conditions = sourceConditions(relation, source);
    const rows = await all(
      `SELECT DISTINCT ${source}.${quoted(relation.objectColumn)} AS "objectId" FROM ${from} WHERE ${[`${userSide} = ?`, ...conditions.sql].join(' AND ')}`,
      [userId, ...conditions.params],
    );
    return rows.map((row) => row.objectId);
  }

  /** The inverse: everyone who holds this relation on this object. Only relations with a bounded set of people answer. */
  async function usersHolding(relationCode: Code, objectId: string): Promise<string[]> {
    const relation = relationOf.get(relationCode);
    if (!relation) return [];
    if (relation.via === 'parent') {
      const source = table(relation.sourceTable);
      const conditions = sourceConditions(relation, source);
      const rows = await all(
        `SELECT DISTINCT ${source}.${quoted(relation.throughColumn)} AS "parent" FROM ${source} WHERE ${[`${source}.${quoted(relation.objectColumn)} = ?`, ...conditions.sql].join(' AND ')}`,
        [objectId, ...conditions.params],
      );
      const found = await Promise.all(
        rows.filter((row) => row.parent).map((row) => usersHolding(relation.parentRelation, row.parent)),
      );
      return [...new Set(found.flat())];
    }
    if (relation.via !== 'table') return [];
    const { source, from, userSide } = tableSource(relation);
    const conditions = sourceConditions(relation, source);
    const rows = await all(
      `SELECT DISTINCT ${userSide} AS "userId" FROM ${from} WHERE ${[`${source}.${quoted(relation.objectColumn)} = ?`, ...conditions.sql, `${userSide} IS NOT NULL`].join(' AND ')}`,
      [objectId, ...conditions.params],
    );
    return rows.map((row) => row.userId);
  }

  /** Everyone the vocabulary says may take `action` on `objectId`: the union of the people holding any relation it is granted to. */
  async function audienceFor(action: string, objectId: string): Promise<string[]> {
    const found = await Promise.all(grantsOf(action).map((grant) => usersHolding(grant.relation, objectId)));
    return [...new Set(found.flat())];
  }

  /** The table an action's object lives in, or null for a platform action (nothing exists yet to be in a relation to). */
  function objectTableFor(action: string): string | null {
    const type = typeOf.get(actionOf.get(action)?.objectTypeCode);
    return type?.tableName ? (vocabulary.tables?.[type.tableName] ?? type.tableName) : null;
  }

  /** Does a row with this id exist in that table? A missing object is a 404, not a 403. */
  async function objectExists(tableName: string, id: string): Promise<boolean> {
    return (await all(`SELECT 1 AS "ok" FROM ${quoted(tableName)} WHERE "id" = ? LIMIT 1`, [id])).length > 0;
  }

  /**
   * The subtype of each object, for the grants that narrow by it: the object's own when its type is
   * the narrowing one, its parent's when that is. `context` names the narrowing object for an action
   * about a pair, which no single row can answer.
   */
  async function subtypesFor(
    objectType: Code,
    ids: readonly string[],
    context?: string | null,
  ): Promise<Map<string, unknown>> {
    const none = new Map<string, unknown>(ids.map((id) => [id, null]));
    if (!narrow) return none;
    const type = typeOf.get(objectType);
    let narrowing: Map<string, unknown>;
    if (context !== undefined) narrowing = new Map<string, unknown>(ids.map((id) => [id, context]));
    else if (type?.code === narrow.objectTypeCode) narrowing = new Map<string, unknown>(ids.map((id) => [id, id]));
    else if (type?.parentTypeCode === narrow.objectTypeCode && type.tableName) {
      const source = table(type.tableName);
      const rows = await inBatches(ids, (batch) =>
        all(
          `SELECT ${source}."id" AS "id", ${source}.${quoted(type.parentColumn)} AS "parent" FROM ${source} WHERE ${source}."id" IN (${marks(batch)})`,
          batch,
        ),
      );
      narrowing = new Map<string, unknown>(rows.map((row) => [row.id, row.parent]));
    } else return none;
    const wanted = [...new Set([...narrowing.values()].filter(Boolean))];
    if (wanted.length === 0) return none;
    const source = table(typeOf.get(narrow.objectTypeCode)!.tableName);
    const rows = await inBatches(wanted, (batch) =>
      all(
        `SELECT ${source}."id" AS "id", ${source}.${quoted(narrow.column)} AS "subtype" FROM ${source} WHERE ${source}."id" IN (${marks(batch)})`,
        batch,
      ),
    );
    const subtypes = new Map<unknown, unknown>(rows.map((row) => [row.id, row.subtype]));
    return new Map(ids.map((id) => [id, subtypes.get(narrowing.get(id)) ?? null]));
  }

  /** Does any grant of this action name a relation held, within the subtype where the grant applies? */
  const grantAllows = (action: string, held: Set<string>, subtype: unknown): boolean =>
    grantsOf(action).some(
      (grant) =>
        held.has(grant.relation) &&
        (!narrows(grant) || (subtype !== null && (grant[narrowField] as readonly unknown[]).includes(subtype))),
    );

  /** Which of these relations the viewer holds on each object: platform ones from the session, each other one in a single read. */
  async function relationsHeld(
    user: Viewer,
    wanted: readonly RelationRow[],
    ids: readonly string[],
  ): Promise<Map<string, Set<string>>> {
    const platform = platformRelations(user);
    const onObjects = wanted.filter((relation) => relation.via === 'table' || relation.via === 'parent');
    const sets = await Promise.all(onObjects.map((relation) => heldAmong(relation.code, user, ids)));
    return new Map(
      ids.map((id): [string, Set<string>] => {
        const held = new Set(platform);
        onObjects.forEach((relation, index) => {
          if (sets[index].has(id)) held.add(relation.code);
        });
        return [id, held];
      }),
    );
  }

  /** Which of these objects may the user take this action on? The list form, and the one that does the work. */
  async function canAll(
    action: string,
    user: Viewer,
    objectIds: readonly string[],
    context?: string | null,
  ): Promise<Set<string>> {
    const granted = grantsOf(action);
    if (granted.length === 0 || objectIds.length === 0) return new Set();
    const ids = [...new Set(objectIds)];
    // A platform grant with nothing to narrow it is true for every object and touches no table.
    if (grantAllows(action, platformRelations(user), null)) return new Set(ids);
    const subtypes = granted.some(narrows)
      ? await subtypesFor(actionOf.get(action)?.objectTypeCode, ids, context)
      : new Map<string, unknown>();
    const held = await relationsHeld(
      user,
      relations.filter((relation) => granted.some((grant) => grant.relation === relation.code)),
      ids,
    );
    return new Set(ids.filter((id) => grantAllows(action, held.get(id)!, subtypes.get(id) ?? null)));
  }

  /** May this user take this action on this object? `objectId` is null for a platform action. */
  async function can(action: string, user: Viewer, objectId: string | null, context?: string | null): Promise<boolean> {
    if (!objectId) return grantAllows(action, platformRelations(user), null);
    return (await canAll(action, user, [objectId], context)).has(objectId);
  }

  /** An action about a pair: narrowed by a subtype its own object neither is nor sits under. Only its caller knows the other half. */
  const isPairAction = (action: ActionRow): boolean =>
    Boolean(narrow) &&
    Boolean(typeOf.get(action.objectTypeCode)?.tableName) &&
    action.objectTypeCode !== narrow!.objectTypeCode &&
    typeOf.get(action.objectTypeCode)?.parentTypeCode !== narrow!.objectTypeCode &&
    grantsOf(action.code).some(narrows);

  /** The actions a row of this type answers for its viewer. */
  const actionsOn = (objectType: string): string[] =>
    actions
      .filter((action) => action.objectTypeCode === objectType && !isPairAction(action))
      .map((action) => action.code);

  /**
   * Every action a row of this type answers, for a whole list: what a screen receives with its data.
   * The cost is per relation of the type, not per action or per row.
   */
  async function canFor(
    objectType: string,
    user: Viewer,
    objectIds: readonly string[],
  ): Promise<Map<string, Record<string, boolean>>> {
    const ids = [...new Set(objectIds)];
    if (ids.length === 0) return new Map();
    const own = actionsOn(objectType);
    const [subtypes, held] = await Promise.all([
      own.some((action) => grantsOf(action).some(narrows)) ? subtypesFor(objectType, ids) : new Map<string, unknown>(),
      relationsHeld(
        user,
        relations.filter((relation) => relation.objectTypeCode === objectType),
        ids,
      ),
    ]);
    return new Map(
      ids.map((id): [string, Record<string, boolean>] => [
        id,
        Object.fromEntries(own.map((action) => [action, grantAllows(action, held.get(id)!, subtypes.get(id) ?? null)])),
      ]),
    );
  }

  return {
    vocabulary,
    holds,
    heldAmong,
    objectsHeldBy,
    usersHolding,
    audienceFor,
    objectTableFor,
    objectExists,
    can,
    canAll,
    canFor,
    actionsOn,
    platformRelations,
  } as RelationEngine<V>;
}
