import { lighthouseChecks } from '@joeblew999/remy-ui/checks';

// Google's level: site pages only (paths.js). App pages are noindex by design.
lighthouseChecks({ pages: [
  { path: '/en', device: 'mobile' },
  { path: '/en', device: 'desktop' },
  { path: '/es', device: 'mobile' },
  { path: '/ar', device: 'mobile' },
  { path: '/en/formats', device: 'mobile' },
] });
