// oRPC 1.15.4, as this folder's own node_modules holds it (package.json beside this file): the
// imports below resolve here first, while everything outside this folder gets the app's oRPC 2.
export * as contract from '@orpc/contract';
export * as server from '@orpc/server';
export { RPCHandler } from '@orpc/server/fetch';
