import { createOpenAPI } from 'fumadocs-openapi/server';
import * as app from '@remy-docs-app/contract';
import { generateSpec } from '../../api/server';

// The API reference in the developer docs (/dev/api/...): fumadocs-openapi over the same document the
// app's /api/openapi.json serves, generated from the oRPC contract alone (one source: the contract,
// its `info` and, when it has error codes of its own, their statuses in `errorStatuses`).
export const openapi = createOpenAPI({ input: { remy: () => generateSpec(app.contract, app.info, app.errorStatuses) as never } });
