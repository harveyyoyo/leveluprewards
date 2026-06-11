import { describe, expect, it } from 'vitest';
import { sumPaymentsForAccountYear } from './officeDb';
import type { OfficePayment } from './types';

describe('officeDb', () => {
  it('sumPaymentsForAccountYear totals payments in calendar year', () => {
    const payments: OfficePayment[] = [
      { id: '1', accountId: 'a', amountCents: 1000, method: 'cash', paidAt: new Date('2026-03-01').getTime() },
      { id: '2', accountId: 'a', amountCents: 500, method: 'check', paidAt: new Date('2025-12-01').getTime() },
      { id: '3', accountId: 'b', amountCents: 200, method: 'cash', paidAt: new Date('2026-01-01').getTime() },
    ];
    expect(sumPaymentsForAccountYear(payments, 'a', 2026)).toBe(1000);
  });
});
