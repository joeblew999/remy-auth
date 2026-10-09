import type { AnyMetaPlugin } from '@orpc/contract';
import type { Policy } from './guard-core.js';

export declare function policy(who: Policy): AnyMetaPlugin;
export declare function personal(whoReceives: string): AnyMetaPlugin;
