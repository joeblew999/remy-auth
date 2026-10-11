import { run, steps, where } from './flow.ts';

// STEP 4 of the flow, rarely and on the owner's word: a release, every check in every language
// locally, then the tag (packages:release does both).
export function main(): void {
  const here = where();
  if (!here.onMain || !here.clean) { console.error(`dev:release: a release is made from a clean main (this is ${here.branch}${here.clean ? '' : ', with changes'}); npm run dev:land first`); process.exit(1); }
  for (const task of steps.release.tasks) run(task, 'release');
}
