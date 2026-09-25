import type { StatusQuery } from '@joeblew999/remy-ui/parts/status-card/query';
import { orpc } from '../api/client';

// This app's options for the status-card part (src/parts.json; .plans/parts.md): the query on its
// contract's GET /api/status, the router itself on the server during SSR, HTTP with the response
// checked against the contract in the browser. Unused when the part is not listed.
export const statusQuery: StatusQuery = orpc.status.queryOptions();
