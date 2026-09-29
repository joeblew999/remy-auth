import { implement } from '@orpc/server';
import { contract } from '@joeblew999/remy-fixture-contract';

const api = implement(contract);
export const router = api.router({ hello: api.hello.handler(() => ({ greeting: 'hello' })) });
