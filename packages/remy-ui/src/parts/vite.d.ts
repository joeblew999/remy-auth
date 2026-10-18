import type { Plugin } from 'vite';
import type { VirtualRootRoute } from '@tanstack/virtual-file-routes';
import type { PartName } from './list.js';
export declare function remyParts(options?: { root?: string; file?: string; routesDirectory?: string }): {
  names: PartName[];
  routes: VirtualRootRoute;
  plugin: Plugin;
};
