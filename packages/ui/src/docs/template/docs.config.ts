import { defineDocsConfig } from '@joeblew999/remy-ui/docs/config';

// This app's docs: what they say about the product (with content/, the whole of the app's docs; the Worker
// is @joeblew999/remy-ui's). Replace every "My app" and URL. Ask AI is off until `ask` names its resources
// (the owner creates them; mise run docs:provision prints what they would be).
export const docsConfig = defineDocsConfig({
  product: 'My app',
  titles: { docs: 'My app guide', dev: 'My app developer docs', reference: 'My app API reference' },
  mcp: {
    docs: { name: 'my-app-guide', audience: "My app's guide, for people using the app. Not for developers: the developer docs are my-app-developer-docs." },
    dev: { name: 'my-app-developer-docs', audience: "My app's developer docs, for people building it. The API itself is my-app-api-reference." },
    reference: { name: 'my-app-api-reference', audience: "My app's API reference, for developers calling its API." },
  },
  appUrl: 'https://my-app.example.workers.dev',
  service: 'my-app-docs',
  repository: 'https://github.com/you/my-app',
  branch: 'main',
});
