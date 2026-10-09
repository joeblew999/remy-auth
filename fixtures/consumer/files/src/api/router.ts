import { implement } from '@orpc/server';
import { contract } from '@joeblew999/remy-fixture-contract';
import { guard, type GuardContext } from '@joeblew999/remy-ui/api/guard';

// Behind the platform's guard, like every app's API: it enforces each procedure's contract policy.
const api = implement(contract).$context<GuardContext<never>>().use(guard<never>());
export const router = api.router({ hello: api.hello.handler(() => ({ greeting: 'hello' })) });
