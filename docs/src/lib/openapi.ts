import { createOpenAPI } from 'fumadocs-openapi/server';
import { contract, info } from '@joeblew999/remy-auth-contract';
import { generateSpec } from '@joeblew999/remy-ui/api/server';

// The API reference in the developer docs (/dev/api/...): fumadocs-openapi over the same document the
// app's /api/openapi.json serves, generated from the oRPC contract alone (one source: the contract).
export const openapi = createOpenAPI({ input: { remy: () => generateSpec(contract as never, info) as never } });
