import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { betterAuth } from 'better-auth';
import { authOptions } from './options';

// The Better Auth CLI's configuration (`mise run auth:generate`), never loaded by the Worker. A D1
// binding does not exist in Node, so the CLI compares the options with a throwaway SQLite database
// built from migrations/: what `auth generate` writes is exactly what the migrations do not have yet.
const database = new DatabaseSync(':memory:');
for (const file of readdirSync('migrations').filter(name => name.endsWith('.sql')).sort()) database.exec(readFileSync(`migrations/${file}`, 'utf8'));

export const auth = betterAuth(authOptions({
  database,
  secret: 'cli-only-generates-sql-and-signs-nothing',
  baseURL: 'http://localhost',
  sendCode: async () => { throw new Error('The CLI sends no mail.'); },
}));
