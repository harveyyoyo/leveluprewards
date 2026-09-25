import { describe, expect, it } from 'vitest';
import { buildOfficeAiHelpContext, formatOfficeAiHelpContextBlock } from '@/lib/office/officeHelpContext';

describe('officeHelpContext', () => {
  it('summarizes billing snapshot without student names', () => {
    const ctx = buildOfficeAiHelpContext({
      students: [{ id: 's1' } as never],
      families: [{ id: 'f1', displayName: 'Lee family' }],
      billingAccounts: [{ id: 'a1', familyName: 'Lee family' } as never],
      invoices: [
        {
          id: 'i1',
          accountId: 'a1',
          status: 'sent',
          amountCents: 5000,
          paidAmountCents: 0,
          dueDate: '2020-01-01',
        } as never,
      ],
      useMarksTerminology: true,
    });
    expect(ctx.overdueInvoiceCount).toBe(1);
    expect(ctx.marksTerminology).toBe('marks');
    const block = formatOfficeAiHelpContextBlock(ctx);
    expect(block).toContain('Lee family');
    expect(block).toContain('$50.00');
  });

  it('counts overdue families separately from bills, and lists class sizes', () => {
    const overdueBill = (id: string, accountId: string) =>
      ({ id, accountId, status: 'sent', amountCents: 100, paidAmountCents: 0, dueDate: '2020-01-01' }) as never;
    const ctx = buildOfficeAiHelpContext({
      students: [
        { id: 's1', classId: 'c1' },
        { id: 's2', classId: 'c2' },
        { id: 's3', classId: 'c2' },
        { id: 's4', classId: 'c2', status: 'withdrawn' },
      ] as never,
      families: [],
      billingAccounts: [{ id: 'a1', familyName: 'Lee' }, { id: 'a2', familyName: 'Kim' }] as never,
      invoices: [overdueBill('i1', 'a1'), overdueBill('i2', 'a1'), overdueBill('i3', 'a2')],
      classes: [
        { id: 'c1', name: 'Grade 1' },
        { id: 'c2', name: 'Grade 2' },
      ],
    });
    expect(ctx.overdueInvoiceCount).toBe(3);
    expect(ctx.overdueFamilyCount).toBe(2);
    expect(ctx.classSizes).toEqual([
      { name: 'Grade 2', students: 2 },
      { name: 'Grade 1', students: 1 },
    ]);
    const block = formatOfficeAiHelpContextBlock(ctx);
    expect(block).toContain('3 invoice(s) from 2 families');
    expect(block).toContain('Grade 2 2; Grade 1 1');
  });
});
