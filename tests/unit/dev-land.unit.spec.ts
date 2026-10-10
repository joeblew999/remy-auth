import { test, expect } from '@playwright/test';
import { ended, span, took } from '../../tasks/dev/feedback';

// dev:land says what each of its parts took (owner, 2026-10-10, of a landing usable after 40 seconds
// that held the terminal for six minutes: "how can it be 6 minutes"). The words are a function.

test('a landing says how long the whole took, then each part, as a person reads time', () => {
  expect(span(400)).toBe('0 s');
  expect(span(6_400)).toBe('6 s');
  expect(span(60_000)).toBe('1 min 0 s');
  expect(span(314_000)).toBe('5 min 14 s');
  expect(took([{ what: 'the check', ms: 6_000 }, { what: 'commit, main and push', ms: 4_000 }, { what: 'staging', ms: 33_000 }, { what: 'translation', ms: 314_000 }]))
    .toBe('5 min 57 s: the check 6 s, commit, main and push 4 s, staging 33 s, translation 5 min 14 s');
});

// A landing that fails after the push (staging's deploy or smoke, the translation) still finishes
// what it can and ends with the whole state (owner, 2026-10-10, after one stopped at the smoke with the
// translation silently skipped: "now you and other agents are screwed").
test('a landing ends with the whole state after the push, and fails when staging or the translation did', () => {
  const parts = [{ what: 'the check', ms: 6_000 }, { what: 'commit, main and push', ms: 4_000 }, { what: 'staging', ms: 33_000 }, { what: 'translation', ms: 314_000 }];
  const clean = ended({ commit: '9102bf7abcdef', staging: 'up', translation: 'done' }, parts);
  expect(clean.failed).toBe(false);
  expect(clean.line).toBe('dev:land: done in 5 min 57 s: the check 6 s, commit, main and push 4 s, staging 33 s, translation 5 min 14 s. main is pushed at 9102bf7; staging is up; translation done and pushed.');
  const smoke = ended({ commit: '9102bf7abcdef', staging: 'failed', translation: 'done' }, parts);
  expect(smoke.failed).toBe(true);
  expect(smoke.line).toMatch(/^dev:land: ended with a failure after 5 min 57 s/);
  expect(smoke.line).toContain('main is pushed at 9102bf7');
  expect(smoke.line).toContain('staging FAILED');
  expect(smoke.line).toContain('translation done and pushed');
  const owed = ended({ commit: '9102bf7abcdef', staging: 'up', translation: 'failed' }, parts);
  expect(owed.failed).toBe(true);
  expect(owed.line).toContain('translation FAILED and still owed');
  expect(ended({ commit: '9102bf7abcdef', staging: 'none', translation: 'up to date' }, parts).failed).toBe(false);
});
