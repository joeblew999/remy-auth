// The app's fixed questions (docs/content/questions.json): each must find its docs page among the top three
// results of the AI Search index. Search only, through Wrangler (`ai-search search`): no answer is
// written, so this costs next to nothing and says whether retrieval is right. Results are R2 files
// (<slug>.md); the docs table maps each back to its page, as the answer code does. Argument: instance.
import { execFileSync } from 'node:child_process';
import { docsConfig, questions as appQuestions, table } from './app-table.mjs';

const { docsObjectForKey, docsUrl } = table;

const instance = process.argv[2] ?? docsConfig.ask?.instance;
if (!instance) { console.log('docs:questions: Ask AI is off (docs.config.ts has no `ask`).'); process.exit(0); }
const questions = appQuestions();
const search = query => JSON.parse(execFileSync('./node_modules/.bin/wrangler', ['ai-search', 'search', instance, '--query', query, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const pageOf = chunk => { const object = docsObjectForKey(chunk.item.key); return object ? docsUrl(object.row.site, object.row.slug, object.lang) : `(not a docs page: ${chunk.item.key})`; };
console.log(`Target: Cloudflare (remote), AI Search ${instance}: ${questions.length} questions, search only (no answers written)`);
let failed = 0;
for (const { question, finds } of questions) {
  const page = finds.split('#')[0];
  const pages = [...new Set(search(question).chunks.map(pageOf))];
  const rank = pages.indexOf(page) + 1;
  const ok = rank > 0 && rank <= 3;
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${question} -> ${page} ${rank ? `(rank ${rank})` : '(not found)'}${ok ? '' : `; top: ${pages.slice(0, 3).join(', ')}`}`);
}
if (failed) { console.log(`${failed} of ${questions.length} questions did not find their page`); process.exit(1); }
