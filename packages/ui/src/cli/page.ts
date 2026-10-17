import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// What the docs translator may write, as functions: translate.ts passes every agent result through
// pageFrom, and
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
  const lacking = Object.keys(source.fields).filter((key) => !page.fields[key]);
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

// --- .md or .mdx: decided by the page, never by a person ------------------------------------------------
// Plain .md is read the same everywhere: the docs site, an agent reading the file, GitHub, the remy skill other
// repos' agents get. .mdx only works on the site, so it is for pages that need a component and nothing else
// (owner, 2026-10-17: "how do you know that?" — nobody has to: the check renames the page).

/** Whether a page needs MDX: a component (a capitalised tag, or `<include>`) outside code. */
export function needsMdx(page: string): boolean {
  const prose = page.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
  return /<(?:[A-Z][A-Za-z]*|include)[\s/>]/.test(prose);
}

/**
 * Gives every English page under `dirs` the ending its content needs, renaming its translations with it and
 * fixing the links to it in the same folder; returns what was renamed ("old -> new"). With `verify` it renames nothing
 * and returns what would be (npm run ci fails on it: CI says what dev:change would have fixed).
 */
export function rightEndings(dirs: string[], verify = false): string[] {
  const renamed: string[] = [];
  const translation = /\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.mdx?$/;
  for (const dir of dirs.filter((dir) => existsSync(dir))) {
    for (const folder of [
      dir,
      ...readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(dir, entry.name)),
    ]) {
      const files = readdirSync(folder).filter((name) => /\.mdx?$/.test(name));
      for (const name of files.filter((name) => !translation.test(name))) {
        const want = needsMdx(readFileSync(join(folder, name), 'utf8')) ? '.mdx' : '.md';
        if (name.endsWith(want)) continue;
        if (verify) {
          renamed.push(`${join(folder, name)} should be ${name.replace(/\.mdx?$/, want)}`);
          continue;
        }
        const base = name.replace(/\.mdx?$/, '');
        for (const file of files.filter(
          (file) =>
            file === name ||
            (translation.test(file) &&
              file.startsWith(`${base}.`) &&
              /^\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.mdx?$/.test(file.slice(base.length))),
        )) {
          const next = file.replace(/\.mdx?$/, want);
          renameSync(join(folder, file), join(folder, next));
          renamed.push(`${join(folder, file)} -> ${next}`);
        }
        const from = new RegExp(`\\./${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.mdx?(?=[)"'#])`, 'g');
        for (const other of readdirSync(folder).filter((file) => /\.mdx?$/.test(file))) {
          const text = readFileSync(join(folder, other), 'utf8');
          const fixed = text.replace(from, `./${base}${want}`);
          if (fixed !== text) writeFileSync(join(folder, other), fixed);
        }
      }
    }
  }
  return renamed;
}
