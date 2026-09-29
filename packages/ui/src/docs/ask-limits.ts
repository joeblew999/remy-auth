// What the answer page shares between the server (ask.server.ts) and the browser (the form, the page).

/** The longest question the page accepts, in characters (UTF-16 code units, as the browser's maxLength counts). */
export const askMaxLength = 300;

/** What the page shows: nothing asked yet, an answer with its citations, or why there is none. */
export type AskResult =
  | { status: 'empty' }
  | { status: 'too-long'; length: number }
  | { status: 'rate-limited' }
  | { status: 'no-answer' }
  | { status: 'answered'; answer: string; citations: { url: string; title: string }[] };
