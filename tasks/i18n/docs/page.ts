// What the docs translator may write, as functions: i18n:docs:translate passes every agent result
// through pageFrom (accept.ts beside this file, the last stage of its pipe), and
// tests/unit/i18n-docs.unit.spec.ts holds every translated page in the repository to broken. On
// 2026-10-09 the agent returned nothing for one page, the pipe lost its failure, and the word "null"
// was committed as the Spanish "How we work": the docs stopped building on main and every check was
// green (.plans/stability-log.md). The docs build stays the full check (Fumadocs' schema, the MDX
// compiler); this is the part that needs no build, so it runs on every check.

/** A page's frontmatter fields (the `key: value` lines between its `---` lines) and the text after them; undefined when it has no frontmatter. */
export function parts(page: string): { fields: Record<string, string>; text: string } | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(page);
  if (!match) return undefined;
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (field?.[1]) fields[field[1]] = (field[2] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { fields, text: page.slice(match[0].length) };
}

/** Why `translation` is not a page of `english`, or undefined when it is one: every frontmatter field the English has, each with a value, and text where the English has text. */
export function broken(english: string, translation: string): string | undefined {
  const source = parts(english);
  if (!source) return translation.trim() ? undefined : 'it is empty';
  const page = parts(translation);
  if (!page) return 'it has no frontmatter, and its English page has one';
  const lacking = Object.keys(source.fields).filter(key => !page.fields[key]);
  if (lacking.length) return `its frontmatter lacks ${lacking.join(', ')}`;
  if (source.text.trim() && !page.text.trim()) return 'it has no text after the frontmatter';
  return undefined;
}

/** The page to write from what the agent returned (its structured result, `{ content }`), or why nothing is written. */
export function pageFrom(result: unknown, english: string): { content: string } | { refused: string } {
  const content = typeof result === 'object' && result !== null && 'content' in result ? result.content : undefined;
  if (typeof content !== 'string') return { refused: 'the agent returned no page' };
  const why = broken(english, content);
  return why ? { refused: `what the agent returned is not the page: ${why}` } : { content };
}
