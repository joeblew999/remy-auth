import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { docsTableOf } from '../docs/table-core.js';

// The docs table over the app these scripts run in (the shared docs tasks run them from its root): its
// docs/content/ files and its docs/docs.config.ts, read from the file system (Node runs TypeScript itself).
const root = process.cwd();
const json = file => JSON.parse(readFileSync(join(root, 'docs', file), 'utf8'));
export const { docsConfig } = await import(pathToFileURL(join(root, 'docs', 'docs.config.ts')).href);
export const table = docsTableOf({
  users: { meta: json('content/users/meta.json'), i18n: json('content/users/i18n.json') },
  dev: { meta: json('content/dev/meta.json'), i18n: json('content/dev/i18n.json') },
}, docsConfig);
/** The app's fixed Ask AI questions (docs/content/questions.json), each with the page it must find. */
export const questions = () => json('content/questions.json');
