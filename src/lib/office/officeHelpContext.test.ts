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
});
