// Fixed sample values for the formats and demo pages and for the shared checks. Constants keep
// server and browser output identical and let the checks compute the expected text per locale.
export const samples = {
  instant: new Date('2026-09-24T09:30:00Z'),
  date: new Date('2026-12-25T00:00:00Z'),
  rangeStart: new Date('2026-09-24T00:00:00Z'),
  rangeEnd: new Date('2026-09-26T00:00:00Z'),
  days: 3,
  decimal: 12345.678,
  share: 0.256,
  amount: 1234.5,
  km: 12.5,
  big: 1234567,
  currencies: ['JPY', 'KWD'],
  region: 'DE',
  // 22 and 25 are Polish few and many; Arabic needs every one of its six forms among these.
  counts: [0, 1, 2, 3, 11, 22, 25, 100],
  positions: [1, 2, 3, 4, 11, 22, 103],
  statuses: ['accepted', 'declined', 'pending'],
  guest: 'Alex',
  names: ['Zoë', 'Émile', 'ñandú', 'Nadia', 'Ángel', 'zebra', 'أحمد'],
  // Uppercased by CSS in the page's language: Turkish gives İSTANBUL, every other language ISTANBUL.
  casing: 'istanbul',
  // A 63-letter German compound: with hyphens: auto and the page's language it must still fit 320 px.
  longWord: 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz',
  // A date in another calendar is written with year, month and day fields, not dateStyle: the
  // Hebrew calendar's dateStyle output in Hebrew is broken in Chrome and workerd (.plans/hard-localisation.md).
  calendarDate: { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' },
};
