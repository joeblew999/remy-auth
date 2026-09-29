import { remyDocs } from '@joeblew999/remy-ui/docs/vite';
import { docsConfig } from './docs.config';

// This app's docs Worker: @joeblew999/remy-ui's, over content/ and docs.config.ts. With an API, name its
// contract's package so /reference documents it: remyDocs(docsConfig, { contract: '@you/my-app-contract' }).
export default remyDocs(docsConfig);
