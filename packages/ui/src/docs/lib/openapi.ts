import { createOpenAPI } from 'fumadocs-openapi/server';
import { contract, info } from '@remy-docs-app/contract';
import { generateSpec } from '../../api/server';

// The API reference in the developer docs (/dev/api/...): fumadocs-openapi over the same document the
// app's /api/openapi.json serves, generated from the oRPC contract alone (one source: the contract).
export const openapi = createOpenAPI({ input: { remy: () => generateSpec(contract, info) as never } });
