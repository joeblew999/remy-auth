// The app's origins, given to its build from remy.config.ts (origins.production, staging, docs) as
// import.meta.env.VITE_DEPLOY_ORIGIN, VITE_STAGING_ORIGIN and VITE_DOCS_ORIGIN. The build reads the file itself, so
// every way of building gets the same addresses (vp run build, vp build, Cloudflare's build) and Vite Plus counts
// remy.config.ts among the build's inputs. One given in the environment wins, as Vite's own variables do.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const names = { production: 'VITE_DEPLOY_ORIGIN', staging: 'VITE_STAGING_ORIGIN', docs: 'VITE_DOCS_ORIGIN' };

export function remyOrigins({ root = process.cwd() } = {}) {
  return {
    name: 'remy-origins',
    async config() {
      const file = resolve(root, 'remy.config.ts');
      if (!existsSync(file)) return;
      const origins = (await import(pathToFileURL(file).href)).default?.origins ?? {};
      const define = {};
      for (const [key, name] of Object.entries(names))
        if (origins[key] && process.env[name] === undefined)
          define[`import.meta.env.${name}`] = JSON.stringify(origins[key]);
      return { define };
    },
  };
}
