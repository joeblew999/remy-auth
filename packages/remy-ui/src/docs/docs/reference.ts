import { createServerFn } from '@tanstack/react-start';
import { referencePage } from './reference.server';

/** An API reference page from the server (reference.server.ts). */
export const getReferencePage = createServerFn({ method: 'GET' })
  .validator((splat: string) => splat)
  .handler(({ data }) => referencePage(data));
