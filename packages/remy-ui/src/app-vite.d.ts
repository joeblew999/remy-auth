import type { PluginOption, UserConfig } from 'vite';
import type { BuildOptions } from './build-vite';

/** An app's Vite configuration: TanStack Start on Cloudflare with the shared parts, routes, fonts and devtools. */
export declare function remyApp(options?: {
  /** The app's own Vite plugins, after TanStack Devtools and before the shared ones. */
  plugins?: PluginOption[];
  /** More TanStack Start options (e.g. `prerender`), merged over the shared ones. */
  start?: Record<string, any>;
  /** More Cloudflare Vite plugin options. */
  cloudflare?: Record<string, any>;
  /** The dev server's port (default 5173). */
  port?: number;
  /** The app's root (default the working directory). */
  root?: string;
  /** The build stamp's options: `packages` names more packages whose installed versions it lists. */
  build?: Omit<BuildOptions, 'root'>;
}): UserConfig;
