import type { UserConfig } from 'vite';
import type { RemyDocsConfig } from './config.js';

/** The docs Worker's Cloudflare configuration from an app's docs settings. */
export declare function docsWorkerConfig(docsConfig: RemyDocsConfig, srcDirectory: string): Record<string, unknown>;

/**
 * The docs Worker's Vite configuration for the app whose docs/ it runs in. `contract`: the package of the
 * app's oRPC contract, which /reference documents; an app without an API leaves it out.
 */
export declare function remyDocs(docsConfig: RemyDocsConfig, options?: { contract?: string; root?: string }): UserConfig;
