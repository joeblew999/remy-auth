import { oc } from '@orpc/contract';
import { z } from 'zod';
import type { ApiMeta } from '@joeblew999/remy-ui/api/coverage';

const route = oc.$meta<ApiMeta>({});
export const info = { title: 'fixture API', version: '0.0.1', description: 'Contract: @joeblew999/remy-fixture-contract.' };
export const contract = {
  hello: route.meta({ policy: 'public' }).route({ method: 'GET', path: '/api/hello', summary: 'A greeting', tags: ['hello'] })
    .output(z.object({ greeting: z.string() })),
};
