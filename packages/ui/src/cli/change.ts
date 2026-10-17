import { check } from './check.ts';
import { describeRun, latestRun } from './flow.ts';

// STEP 1 of the flow, after every change: the check, in seconds. The only step anyone waits for.
export async function main(): Promise<void> {
  await check();
  // GitHub's answer on the last landing, so a session starts knowing it; one line, never a failure here.
  const last = latestRun();
  if (last) console.log(`dev:change: GitHub's last run on main was ${describeRun(last)}`);
  console.log(
    'dev:change: ok. Next: npm run dev:land -- "<what changed>" when the work is finished; it is yours to run, not a question.',
  );
}
