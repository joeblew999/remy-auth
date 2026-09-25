import { performanceChecks } from '@joeblew999/remy-ui/checks';

performanceChecks({ pages: [
  { path: '/en', device: 'mobile' },
  { path: '/en', device: 'desktop' },
  { path: '/en/formats', device: 'mobile' },
  // One docs page (.plans/docs-site.md): the GUI guide, with text, tables and code blocks.
  { path: '/en/docs/gui', device: 'mobile' },
] });
