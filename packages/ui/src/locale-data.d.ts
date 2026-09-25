import type { Locale } from './paraglide/runtime.js';
/** The largest count the formats page takes in its address. */
export declare const maxCount: number;
/** One language's own values, derived from the runtime's CLDR data and its region's currency. */
export type OwnValues = {
  region: string; script: string; currency: string; calendars: string[]; numberingSystems: string[]; counts: number[];
};
export declare function ownValues(locale: Locale): OwnValues;
/** The formats page's try-it controls, each a search param. */
export type ChoiceKind = 'calendar' | 'numbering' | 'currency' | 'count';
export declare const choiceKinds: ChoiceKind[];
type ChoiceValue<K extends ChoiceKind> = K extends 'count' ? number : string;
/** Every value of a control over all of Paraglide's locales. */
export declare function allChoices<K extends ChoiceKind>(kind: K): ChoiceValue<K>[];
/** A control's choices on this language's page: its own values first, then every other language's. */
export declare function choicesFor<K extends ChoiceKind>(locale: Locale, kind: K): { own: ChoiceValue<K>[]; others: ChoiceValue<K>[] };
/** The values the page shows with no search params, from the base locale. */
export declare const searchDefaults: { currency: string; count: number; calendar: string; numbering: string };
