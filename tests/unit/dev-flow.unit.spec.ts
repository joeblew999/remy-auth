import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from 'smol-toml';
import { heavy } from '../../tasks/dev/flow';

// The flow's gate (tasks/dev/allowed.ts) refuses a heavy task that nobody said they were running. On
// 2026-10-10, a day after the gate, eight lines on five pages still gave such a command bare, and
// project:setup, packages:upgrade and project:upgrade-ui each ended in the refusal: GitHub runs none
// of the three, so every check was green. Reading the pages and the tasks is a plain function.

// A heavy task run through mise: `mise run project:test`, never `mise run project:test:only`.
const names = Object.keys(heavy).filter(task => !task.includes(' ')).map(task => task.replace(/[:.]/g, '\\$&')).join('|');
const runsHeavy = new RegExp(`\\bmise\\s+run\\s+(?:-\\S+\\s+)*(${names})(?![\\w:-])`);
const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = `${dir}/${name}`; return statSync(path).isDirectory() ? walk(path) : [path]; });

test('no English page gives a command the tooling refuses: a heavy task is run with REMY_FLOW=hand in front, or named without mise run', () => {
  const translation = /\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.mdx?$/;
  const pages = [...walk('docs/content').filter(file => /\.mdx?$/.test(file) && !translation.test(file)), 'README.md', 'AGENTS.md', 'CLAUDE.md'].filter(file => existsSync(file));
  expect(pages.length).toBeGreaterThan(5);
  const bare = pages.flatMap(file => readFileSync(file, 'utf8').split('\n').flatMap((line, index) => {
    const found = runsHeavy.exec(line);
    return found && !/REMY_FLOW=hand\b/.test(line.slice(0, found.index)) ? [`${file}:${index + 1}: mise run ${found[1]}`] : [];
  }));
  expect(bare).toEqual([]);
});

test('no task runs a heavy task without saying who is asking: REMY_FLOW on the line, or the flow\'s own steps', () => {
  // Scripts: every line that is not a comment or a description. The TypeScript steps set REMY_FLOW in
  // flow.ts's run() and land.ts's task(), and name heavy tasks only in what they print.
  const scripts = walk('tasks').filter(file => !/\.(ts|toml|md)$/.test(file));
  const bare = scripts.flatMap(file => readFileSync(file, 'utf8').split('\n').flatMap((line, index) => {
    if (/^\s*(#|\/\/)/.test(line) || /dev:allowed\s+--/.test(line)) return [];
    const found = runsHeavy.exec(line);
    return found && !/\bREMY_FLOW=/.test(line.slice(0, found.index)) ? [`${file}:${index + 1}: mise run ${found[1]}`] : [];
  }));
  expect(bare).toEqual([]);

  // TOML tasks: a run list reaches a heavy task as a command or as { task = "…" }. A command says who
  // is asking; a { task } is only for a task that is itself heavy (its caller was asked already) or
  // for packages:release, which dev:release runs with REMY_FLOW=release.
  const viaFlow = new Set(['packages:release']);
  const tomls = [...walk('tasks').filter(file => file.endsWith('.toml')), 'mise.toml'].filter(file => existsSync(file));
  const wrong = tomls.flatMap(file => {
    const parsed = parse(readFileSync(file, 'utf8')) as Record<string, any>;
    const tasks: Record<string, any> = file === 'mise.toml' ? parsed.tasks ?? {} : parsed;
    return Object.entries(tasks).flatMap(([name, task]) => {
      const run: unknown[] = Array.isArray(task?.run) ? task.run : task?.run ? [task.run] : [];
      const asked = name in heavy || viaFlow.has(name);
      return run.flatMap(entry => {
        if (typeof entry === 'string') {
          const found = /dev:allowed\s+--/.test(entry) ? null : runsHeavy.exec(entry);
          return found && !/\bREMY_FLOW=/.test(entry.slice(0, found.index)) ? [`${file} ${name}: mise run ${found[1]} without REMY_FLOW`] : [];
        }
        const called = (entry as { task?: string })?.task;
        return called && called in heavy && !asked ? [`${file} ${name}: { task = "${called}" } from a task the flow does not run`] : [];
      });
    });
  });
  expect(wrong).toEqual([]);
});

test('the tasks that end with the verification are the three the gate names, and each says it is asking', () => {
  const setup = (parse(readFileSync('tasks/project.toml', 'utf8')) as Record<string, any>)['project:setup'].run as unknown[];
  expect(setup.at(-1)).toBe('REMY_FLOW=${REMY_FLOW:-setup} mise run project:verify');
  for (const file of ['tasks/packages/upgrade', 'tasks/project/upgrade-ui']) expect(readFileSync(file, 'utf8'), file).toMatch(/^REMY_FLOW="\$\{REMY_FLOW:-upgrade\}" mise run project:verify$/m);
});
