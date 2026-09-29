import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

/** This Worker's origin, from the request (for the absolute URLs the landing page shows). */
export const docsOrigin = createServerFn().handler(() => new URL(getRequest().url).origin);
