// The fixed questions (src/docs/questions.json): each must find its docs section among the top three
// results of the AI Search index. Search only, through Wrangler (`ai-search search`): no answer is
// written, so this costs next to nothing and says whether retrieval is right. A question whose page
// is not in the instance (a dev instance holding a few pages) is skipped. Argument: the instance.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const instance = process.argv[2] ?? 'remy-docs';
const questions = JSON.parse(readFileSync(new URL('../src/docs/questions.json', import.meta.url), 'utf8'));
const search = query => JSON.parse(execFileSync('./node_modules/.bin/wrangler', ['ai-search', 'search', instance, '--query', query, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
console.log(`Target: Cloudflare (remote), AI Search ${instance}: ${questions.length} questions, search only (no answers written)`);
let failed = 0;
for (const { question, finds } of questions) {
  const urls = [...new Set(search(question).chunks.map(chunk => chunk.item.metadata?.url))];
  const page = finds.split('#')[0];
  if (!urls.some(url => url?.split('#')[0] === page) && !urls.includes(finds)) {
    // Nothing from that page came back: in a dev instance the page is usually not indexed.
    const indexed = search(page).chunks.some(chunk => chunk.item.metadata?.url?.startsWith(`${page}#`));
    if (!indexed) { console.log(`  skip  ${question} (${page} is not in ${instance})`); continue; }
  }
  const rank = urls.indexOf(finds) + 1;
  const ok = rank > 0 && rank <= 3;
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${question} -> ${finds} ${rank ? `(rank ${rank})` : '(not found)'}${ok ? '' : `; top: ${urls.slice(0, 3).join(', ')}`}`);
}
if (failed) { console.log(`${failed} of ${questions.length} questions did not find their section`); process.exit(1); }
