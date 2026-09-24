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
  counts: [0, 1, 2, 3, 11, 100],
  positions: [1, 2, 3, 4, 11, 22, 103],
  statuses: ['accepted', 'declined', 'pending'],
  guest: 'Alex',
  names: ['Zoë', 'Émile', 'ñandú', 'Nadia', 'Ángel', 'zebra', 'أحمد'],
};
