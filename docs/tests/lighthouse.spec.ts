import { lighthouseChecks } from '@joeblew999/remy-ui/checks';

// Google's audits on the docs Worker: one guide page with pictures and a video, one developer page with
// text, tables and code blocks, one API reference page.
lighthouseChecks({ pages: [
  { path: '/docs/formats', device: 'mobile' },
  { path: '/dev/gui', device: 'mobile' },
  { path: '/reference/reservations.create', device: 'desktop' },
] });
