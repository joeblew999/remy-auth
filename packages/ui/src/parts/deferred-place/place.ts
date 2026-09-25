import { createServerFn } from '@tanstack/react-start';
import { requestPlace } from './place.server';

// The deferred-place part's data (.plans/parts.md): apps import it as `virtual:remy-parts/deferred-place/place`,
// which is `undefined` when the app does not list the part, so no server function is left behind.

/** Cloudflare's geolocation of the request: read in the Worker, also when a client navigation calls it (see place.server.ts). */
export const getPlace = createServerFn({ method: 'GET' }).handler(() => requestPlace());
