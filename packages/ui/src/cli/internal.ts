// A task a step still runs through mise. One place, so each slice of the no-mise plan
// (.plans/tooling-in-typescript.md) replaces one call here with TypeScript and nothing else moves;
// when the last call is gone, so is mise. REMY_FLOW tells the task's gate (allowed.ts) which step asked.
import { spawnSync } from 'node:child_process';

export type Internal = { cwd?: string; args?: string[]; env?: Record<string, string>; quiet?: boolean; silent?: boolean; timeout?: number };

const command = (task: string, { cwd, args, quiet }: Internal) => [...(cwd ? ['--cd', cwd] : []), 'run', ...(quiet ? ['-q'] : []), task, ...(args?.length ? ['--', ...args] : [])];

/** Runs the task in the foreground and answers with its exit code. */
export function internal(task: string, by: string, options: Internal = {}): number {
  const result = spawnSync('mise', command(task, options), { stdio: options.silent ? 'ignore' : 'inherit', env: { ...process.env, ...options.env, REMY_FLOW: by }, timeout: options.timeout });
  return result.status ?? 1;
}

/** Runs the task and answers with what it printed, or nothing when it failed. */
export function internalOutput(task: string, by: string, options: Internal = {}): string | undefined {
  const result = spawnSync('mise', command(task, { quiet: true, ...options }), { encoding: 'utf8', env: { ...process.env, ...options.env, REMY_FLOW: by }, timeout: options.timeout ?? 20_000 });
  return result.status === 0 ? result.stdout : undefined;
}
