import { test, expect } from 'vite-plus/test';
import { links, nowItems } from '../../packages/remy-cli/src/plans';

// The plans rule's reading of Markdown, as plain functions (the whole rule runs on every check as
// `plans`, the first part of `remy change`, which checks this repository's own .plans/).

test('links finds relative Markdown links outside code, inline and by reference, and skips URLs, anchors and absolute paths', () => {
  const text = [
    'See [the plan](cedar.md#slice-0) and [done](done/gui.md "title").',
    'Not these: [web](https://example.test/x.md), [here](#top), [root](/abs.md), `[code](in.md)`.',
    '```',
    '[fenced](no.md)',
    '```',
    '[ref]: ../other.md',
  ].join('\n');
  expect(links(text).map((link) => [link.line, link.target])).toEqual([
    [0, 'cedar.md#slice-0'],
    [0, 'done/gui.md'],
    [5, '../other.md'],
  ]);
});

test('nowItems reads the list items of now.md by section, with their continuation lines, and knows a struck one', () => {
  const now = [
    '# Now',
    '',
    '## What is left, in order',
    '',
    '1. **First** thing',
    '   continued here.',
    '2. ~~**Second**~~ closed 2026-10-10',
    '',
    '## History',
    '',
    '- an old note',
  ].join('\n');
  expect(nowItems(now)).toEqual([
    { section: 'What is left, in order', text: '**First** thing continued here.', closed: false },
    { section: 'What is left, in order', text: '~~**Second**~~ closed 2026-10-10', closed: true },
    { section: 'History', text: 'an old note', closed: false },
  ]);
});
