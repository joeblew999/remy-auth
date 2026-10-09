import { run, steps, where } from './flow.ts';

const here = where();
if (!here.onMain || !here.clean) { console.error(`dev:release: a release is made from a clean main (this is ${here.branch}${here.clean ? '' : ', with changes'}); mise run dev:land first`); process.exit(1); }
for (const task of steps.release.tasks) run(task, 'release');
