import { describe, expect, it } from 'vitest';
import { applyPointsByPeriod, getPeriodKeys } from './helpers';
import {
  applyPointsByPeriod as serverApplyPointsByPeriod,
  getPeriodKeysForDate,
} from '../../../functions/src/pointsByPeriod';

// The kiosk sign-in (server) must file points under the same week/month keys as the app.
describe('server points-by-period copy', () => {
  const days = ['2026-01-01', '2026-01-04', '2026-06-30', '2026-07-01', '2026-09-24', '2026-12-31', '2027-01-03'];

  it.each(days)('matches the app for %s', (iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    const localNoon = new Date(year, month - 1, day, 12).getTime();
    expect(getPeriodKeysForDate({ year, month, day })).toEqual(getPeriodKeys(localNoon));
    expect(serverApplyPointsByPeriod({ all: 3 }, 2, { year, month, day })).toEqual(
      applyPointsByPeriod({ all: 3 }, 2, localNoon),
    );
  });
});
