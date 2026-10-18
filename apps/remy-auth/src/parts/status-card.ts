import type { StatusQuery } from '@joeblew999/remy-showcase/parts/status-card/query';
import { orpc } from '../api/client';

// This app's options for the status-card part (src/parts.json; plan: https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/parts.md): the query on its
// contract's GET /api/status, the router itself on the server during SSR, HTTP with the response
// checked against the contract in the browser. Unused when the part is not listed.
export const statusQuery: StatusQuery = orpc.status.queryOptions();
