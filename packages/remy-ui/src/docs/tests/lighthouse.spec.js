import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lighthouseChecks } from '@joeblew999/remy-ui/checks';

// Google's audits on the docs Worker, over the app's own pages (run from its docs/): each site's first page
// after the index on a phone, and the API reference on a desktop.
const firstPage = (folder) =>
  JSON.parse(readFileSync(join(process.cwd(), 'content', folder, 'meta.json'), 'utf8')).pages.find(
    (page) => page !== 'index' && !page.startsWith('[') && !page.startsWith('---'),
  );
const guide = firstPage('users');
const dev = firstPage('dev');
lighthouseChecks({
  pages: [
    { path: guide ? `/docs/${guide}` : '/docs', device: 'mobile' },
    { path: dev ? `/dev/${dev}` : '/dev', device: 'mobile' },
    ...((await import(pathToFileURL(join(process.cwd(), 'docs.config.ts')).href)).docsConfig.contract
      ? [{ path: '/reference', device: 'desktop' }]
      : []),
  ],
});
