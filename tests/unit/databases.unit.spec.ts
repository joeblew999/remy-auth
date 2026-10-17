import { test, expect } from '@playwright/test';
import { databaseProblems } from '../../packages/ui/src/cli/cloudflare';

// The platform's rule for every D1 database (npx remy cloudflare provisioned, before every deploy): read copies on,
// and in production's region. The infos below are what Cloudflare reported on 2026-10-17, before the fix: the
// Previews' two databases had been made from a machine in the US, and none kept read copies.

const off = { read_replication: { mode: 'disabled' } };
const on = { read_replication: { mode: 'auto' } };

test('a database without read copies, or outside production\'s region, is named with its fix', () => {
  const problems = databaseProblems([
    { name: 'remy-auth', running_in_region: 'APAC', ...off },
    { name: 'remy-auth-staging', running_in_region: 'APAC', ...on },
    { name: 'remy-auth-preview', running_in_region: 'ENAM', ...on },
  ], 'APAC');
  expect(problems).toHaveLength(2);
  expect(problems[0]).toMatch(/^remy-auth: read replication disabled; turn it on/);
  expect(problems[1]).toMatch(/^remy-auth-preview: runs in ENAM, production's in APAC; .*--location apac/);
});

test('every database with read copies in production\'s region passes', () => {
  expect(databaseProblems([
    { name: 'remy-auth', running_in_region: 'APAC', ...on },
    { name: 'remy-auth-demo-preview', running_in_region: 'APAC', ...on },
  ], 'APAC')).toEqual([]);
});

test('a database Cloudflare says nothing of is never taken as right', () => {
  expect(databaseProblems([{ name: 'remy-auth' }], 'APAC')).toEqual(['remy-auth: read replication not reported; turn it on (dashboard: D1, the database, Settings, Read replication)']);
});
