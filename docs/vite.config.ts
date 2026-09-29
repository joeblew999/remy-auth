import { remyDocs } from '@joeblew999/remy-ui/docs/vite';
import { docsConfig } from './docs.config';

// This app's docs Worker: @joeblew999/remy-ui's, over content/ and docs.config.ts, documenting this app's API.
export default remyDocs(docsConfig, { contract: '@joeblew999/remy-auth-contract' });
