import { test, expect } from '@playwright/test';
import { span, took } from '../../tasks/dev/feedback';

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
