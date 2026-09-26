import { performanceChecks } from '@joeblew999/remy-ui/checks';

performanceChecks({ pages: [
  { path: '/en', device: 'mobile' },
  { path: '/en', device: 'desktop' },
  { path: '/en/formats', device: 'mobile' },
] });
