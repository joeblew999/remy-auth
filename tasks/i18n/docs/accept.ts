import { readFileSync } from 'node:fs';
import { pageFrom } from './page.ts';

// The last stage of i18n:docs:translate's pipe for one page: the agent's structured result on stdin,
// the English page's path as the argument, the page on stdout. Whatever is not the page (nothing, the
// "null" of a failed agent, text without the English's frontmatter) is refused with the reason and
// exit 1, so the task writes nothing and the run fails. The rule is page.ts.
const english = process.argv[2];
if (!english) { console.error('usage: <the agent\'s result> | node accept.ts <English page>'); process.exit(2); }
const result: unknown = (() => { try { return JSON.parse(readFileSync(0, 'utf8')); } catch { return undefined; } })();
const page = pageFrom(result, readFileSync(english, 'utf8'));
if ('refused' in page) { console.error(`  ${english}: ${page.refused}`); process.exit(1); }
process.stdout.write(page.content);
