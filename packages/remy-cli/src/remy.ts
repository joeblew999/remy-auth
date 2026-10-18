#!/usr/bin/env node
// remy: the platform's command line, the jobs Vite Plus has no tool for (GitHub, Cloudflare, translation, the
// project's own checks, an installation's setup). Every app gets it by installing @joeblew999/remy-cli: the package's
// bin is the JavaScript emitted from this directory (dist/, by the package's build task), because Node strips types from
// nothing under node_modules; remy-auth alone runs this source as it is.
//
// It is a dispatcher and nothing more: the command named runs, and only it. What runs, in what order and when, is the
// Vite Plus configuration's and the package.json scripts' to say, where it can be read (owner, 2026-10-17: "in that
// configuration file of VP, you see everything. Everything else underneath it should be pretty dumb"). So nothing
// runs here before a command: no settings copied into the environment, no timing records, no checks of the app.
import { tools } from './tools.ts';
import { help } from './help.ts';

const [name = '', ...args] = process.argv.slice(2);
if (name === 'help' || name === '--help' || name === '-h') {
  await help(console.log);
  process.exit(0);
}
const load = tools[name];
if (!load) {
  console.error(`remy: ${name ? `no command "${name}".` : 'a command is needed.'}`);
  await help(console.error);
  process.exit(2);
}
await (await load()).main(args);
