// The time-zones part's checks: its route, through the shared problem checks (known zone, alias
// redirect, localized 404 for an unknown zone).
import { problemChecks } from '../../showcase/problem.checks.js';

export function timeZonesChecks({ known = 'Asia/Tokyo', alias = 'asia/tokyo', unknown = 'Mars/Olympus_Mons' } = {}) {
  problemChecks({ timeZones: { known, alias, unknown } });
}
