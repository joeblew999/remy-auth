import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { Alert, AlertDescription } from '@joeblew999/remy-ui/components/alert';
import { askMaxLength, type AskResult } from '../ask-limits';

// The answer, shared by the answer page (/docs/ask) and the live search panel (search-panel.tsx).

/** The answer and its numbered sources, or why there is none; `data-ask` names the outcome for the checks. */
export function AskAnswer({ locale, result }: { locale: Locale; result: AskResult }) {
  const o = { locale };
  if (result.status === 'empty') return null;
  if (result.status !== 'answered') {
    const text = result.status === 'too-long' ? m.ask_too_long({ length: result.length, max: askMaxLength }, o)
      : result.status === 'rate-limited' ? m.ask_rate_limited({}, o) : m.ask_no_answer({}, o);
    return <Alert data-ask={result.status} variant={result.status === 'no-answer' ? 'default' : 'destructive'}><AlertDescription>{text}</AlertDescription></Alert>;
  }
  return <div data-ask="answered" className="flex flex-col gap-4">
    <h2 className="text-2xl font-semibold tracking-tight">{m.ask_answer({}, o)}</h2>
    <div dir="auto" className="flex flex-col gap-3 leading-7">{result.answer.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    <h3 className="text-lg font-semibold tracking-tight">{m.ask_sources({}, o)}</h3>
    <ol className="ms-6 list-decimal [&>li]:mt-2">
      {result.citations.map(citation => <li key={citation.url}>
        <a data-citation className="font-medium text-primary underline underline-offset-4" lang="en" href={citation.url}>{citation.title}</a>
      </li>)}
    </ol>
  </div>;
}
