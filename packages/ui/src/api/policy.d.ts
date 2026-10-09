import type { AnyMetaPlugin } from '@orpc/contract';
import type { Policy } from './guard-core.js';
import type { ActionCode, Vocabulary } from './relations.js';

export declare function policy(who: Policy): AnyMetaPlugin;
export declare function personal(whoReceives: string): AnyMetaPlugin;
/** The action policies an app's vocabulary allows, typed by its own action codes. */
export declare function actions<V extends Vocabulary>(vocabulary: V): (action: ActionCode<V>, options?: { id?: string }) => AnyMetaPlugin;
