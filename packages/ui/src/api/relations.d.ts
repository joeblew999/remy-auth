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
export type ActionOn<V extends Vocabulary, T extends string> = Extract<V['actions'][number], { objectTypeCode: T }>['code'];
/** What a row of this type carries for its viewer: each of its actions, allowed or not. */
export type Can<V extends Vocabulary, T extends string> = Record<ActionOn<V, T>, boolean>;

/** Who is asking: the session's user, or null for a stranger. */
export type Viewer = { id: string; role?: string | null } | null | undefined;

/** The part of D1's API the engine uses. */
export type RelationsDatabase = { prepare(query: string): { bind(...values: unknown[]): { all(): Promise<{ results: any[] }> } } };

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
  canAll(action: ActionCode<V>, user: Viewer, objectIds: readonly string[], context?: string | null): Promise<Set<string>>;
  /** For a whole list: each row's actions, allowed or not. What a screen receives with its data. */
  canFor<T extends ObjectTypeCode<V>>(objectType: T, user: Viewer, objectIds: readonly string[]): Promise<Map<string, Can<V, T>>>;
  /** The actions a row of this type answers. */
  actionsOn<T extends ObjectTypeCode<V>>(objectType: T): ActionOn<V, T>[];
  platformRelations(user: Viewer): Set<RelationCode<V>>;
};

export declare const MAX_IN: number;
export declare function vocabularyProblems(vocabulary: Vocabulary): string[];
/** What the vocabulary names that the database lacks; `columnsOf` answers a table's columns, or nothing for no such table. */
export declare function schemaProblems(vocabulary: Vocabulary, columnsOf: (table: string) => readonly string[] | undefined): string[];
/** The vocabulary itself, typed by its own codes, refused when it does not hold together. */
export declare function defineVocabulary<const V extends Vocabulary>(vocabulary: V): V;
export declare function relationEngine<const V extends Vocabulary>(vocabulary: V, db: RelationsDatabase): RelationEngine<V>;
