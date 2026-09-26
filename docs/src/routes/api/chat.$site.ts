import { createFileRoute } from '@tanstack/react-router';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { answerQuestion } from '@/ask.server';
import { isSiteName } from '@/lib/source';

// Ask AI's server, for Fumadocs' Ask AI panel (`docs:cli feature ai`, components/ai/search.tsx), per site:
// /api/chat/<site>?lang=es. The CLI's route asks OpenRouter over its own search index; ours asks
// Cloudflare AI Search over the site's published pages (ask.server.ts: rate limit, length, the pause
// switch, one log line per question) and streams the answer and its sources in the AI SDK's format.
// One question at a time: the latest user message.
const say = (text: string) => createUIMessageStreamResponse({
  stream: createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'text-start', id: 'answer' });
      writer.write({ type: 'text-delta', id: 'answer', delta: text });
      writer.write({ type: 'text-end', id: 'answer' });
    },
  }),
});

type Part = { type: string; text?: string };
type Message = { role: string; parts?: Part[] };

export const Route = createFileRoute('/api/chat/$site')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        if (!isSiteName(params.site)) return new Response(undefined, { status: 404 });
        const lang = new URL(request.url).searchParams.get('lang') ?? 'en';
        const { messages = [] } = await request.json() as { messages?: Message[] };
        const question = messages.filter(message => message.role === 'user').at(-1)?.parts
          ?.filter(part => part.type === 'text').map(part => part.text ?? '').join(' ') ?? '';
        const result = await answerQuestion(params.site, question, lang);
        switch (result.status) {
          case 'answered':
            return say(`${result.answer}\n\n${result.citations.map(citation => `- [${citation.title}](${citation.url})`).join('\n')}`);
          case 'rate-limited': return say('Too many questions in a minute: try again shortly.');
          case 'too-long': return say(`That question is ${result.length} characters; ask in 300 or fewer.`);
          case 'empty': return say('Ask a question about these docs.');
          default: return say('The docs do not answer that, or answers are paused. Try the search (⌘K).');
        }
      },
    },
  },
});
