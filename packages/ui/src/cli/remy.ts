#!/usr/bin/env node
// remy: the platform's command line, a Remy app's whole tooling, in TypeScript. Every app gets it by
// installing @joeblew999/remy-ui: the package's bin is the JavaScript emitted from this directory
// (packages/ui/cli, by `npm run generate` and prepack), because Node strips types from nothing under
// node_modules; remy-auth alone runs this source as it is. package.json's scripts are the entry in every
// app, as in every TypeScript project ("dev:land": "remy flow land"), and remy.config.ts holds what is the
// app's own (origins, ports, the release package). Owner, 2026-10-11: "strip away mise so that its all
// typescript", "use the package.json as the entry point like all typescript projects do". The plan that
// did it: .plans/done/tooling-in-typescript.md; remy-auth-app is the first consumer on it.
import { configure } from './config.ts';
import { begin } from './timing.ts';
import { tools } from './tools.ts';
import { help, writeCommands } from './help.ts';

const [name = '', ...args] = process.argv.slice(2);
if (name === 'help' || name === '--help' || name === '-h') {
  if (args.includes('--write')) await writeCommands();
  else await help(console.log);
  process.exit(0);
}
// A bare step name is the flow's (the scripts of apps on 0.15: "dev:land": "remy land").
const steps = ['status', 'start', 'change', 'land', 'promote', 'release', 'done'];
const load =
  tools[name] ??
  (steps.includes(name)
    ? () => import('./flow.ts').then((flow) => ({ main: (rest: string[]) => flow.main([name, ...rest]) }))
    : undefined);
if (!load) {
  console.error(`remy: ${name ? `no command "${name}".` : 'a command is needed.'}`);
  await help(console.error);
  process.exit(2);
}
// Every command is timed here, so none has to time itself (timing.ts): named by its first word and its
// subcommand ("i18n translate", "ci", "flow land"); `remy last` reads the records and is not one.
const sub = args.findIndex((arg) => !arg.startsWith('-'));
if (name !== 'last')
  begin(
    sub === -1 ? name : `${name} ${args[sub]}`,
    args.filter((_, index) => index !== sub),
  );
await configure();
await (await load()).main(args);
