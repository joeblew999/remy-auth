import { run, steps } from './flow.ts';
for (const task of steps.change.tasks) run(task, 'change');
console.log('dev:change: ok. Next: mise run dev:land -- "<what changed>" when it should leave the machine.');
