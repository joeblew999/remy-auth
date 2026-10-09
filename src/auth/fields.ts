import type { BetterAuthOptions } from 'better-auth';
import { getAuthTables } from 'better-auth/db';

/** Better Auth's own tables, where `additionalFields` and plugins add columns a request body can set. */
const core = getAuthTables({});

/**
 * What a person could write that nobody decided they may; empty when every field the options (or a
 * plugin) add to Better Auth's own tables is `input: false` or listed in `mayEdit` with its reason.
 * Better Auth's own columns are left to its endpoints. remy-sport's lesson (.plans/auth-service.md):
 * `statusCode` was an additional field without `input: false`, so a referee awaiting approval
 * posted `{ statusCode: "ACTIVE" }` to /api/auth/update-user and approved themselves.
 */
export function writableFieldProblems(options: BetterAuthOptions, mayEdit: Record<string, Record<string, string>>): string[] {
  const problems: string[] = [];
  const tables = getAuthTables(options);
  for (const [model, table] of Object.entries(core)) {
    for (const [name, field] of Object.entries(tables[model]?.fields ?? {})) {
      if (name in table.fields || field.input === false || mayEdit[model]?.[name]) continue;
      problems.push(`${model}.${name}: a person can write it through Better Auth's endpoints; declare it input: false, or say in personMayEdit why it is theirs to change`);
    }
  }
  for (const [model, fields] of Object.entries(mayEdit)) for (const name of Object.keys(fields)) {
    const field = tables[model]?.fields[name];
    if (!field || field.input === false || name in (core[model]?.fields ?? {})) problems.push(`${model}.${name}: listed in personMayEdit, but it is not a writable additional field`);
  }
  return problems;
}
