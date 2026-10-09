import { oc } from '@orpc/contract';
import { openapi } from '@orpc/openapi';
import { z } from 'zod';
import { policy } from '@joeblew999/remy-ui/api/policy';

export const info = { title: 'fixture API', version: '0.0.1', description: 'Contract: @joeblew999/remy-fixture-contract.' };
export const contract = {
  hello: oc.meta(policy('public')).meta(openapi({ method: 'GET', path: '/api/hello', summary: 'A greeting', tags: ['hello'] }))
    .output(z.object({ greeting: z.string() })),
};
