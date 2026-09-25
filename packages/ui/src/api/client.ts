import { createORPCClient } from '@orpc/client';
import type { AnyContractRouter, ContractRouterClient } from '@orpc/contract';
import { ResponseValidationPlugin } from '@orpc/contract/plugins';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getLocale } from '../paraglide/runtime.js';

// The client half (.plans/openapi-contracts.md): the types are the contract itself, so nothing
// is generated and nothing can drift, and every response is parsed against the contract before
// use, so a response that breaks it is a typed error (oRPC's ValidationError), never wrong data.

/**
 * A typed client for `contract` served at `url` (an origin; contract paths start with /api/):
 * oRPC's OpenAPILink with ResponseValidationPlugin. Requests carry the page's language
 * (Paraglide's getLocale) as Accept-Language, so the server answers in it. Use it to call
 * another Remy app through that app's published contract.
 */
export function contractClient<C extends AnyContractRouter>(contract: C, { url }: { url: string | (() => string) }): ContractRouterClient<C> {
  const link = new OpenAPILink(contract, {
    url,
    headers: () => ({ 'Accept-Language': getLocale() }),
    plugins: [new ResponseValidationPlugin(contract)],
  });
  return createORPCClient(link);
}

/**
 * An app's client for its own contract, the same object on both sides (TanStack Start's
 * createIsomorphicFn): on the server `server()`, which should be oRPC's createRouterClient wrapped
 * in createServerOnlyFn so the router never reaches the browser (no HTTP hop inside a loader);
 * in the browser `contractClient` against this page's origin.
 */
export function isomorphicClient<C extends AnyContractRouter>(contract: C, { server }: { server: () => ContractRouterClient<C> }): ContractRouterClient<C> {
  return createIsomorphicFn()
    .server(server)
    .client(() => contractClient(contract, { url: () => window.location.origin }))();
}
