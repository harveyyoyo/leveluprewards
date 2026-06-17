import { describe, expect, it } from 'vitest';
import {
  accountBalanceFromInvoices,
  autoAllocatePayment,
  invoiceBalanceDueCents,
  invoicePaidCents,
  invoiceRemainingCents,
  resolveInvoiceStatusAfterPayment,
} from './officeBillingPayments';
import type { OfficeInvoice } from './types';

function inv(partial: Partial<OfficeInvoice> & Pick<OfficeInvoice, 'id' | 'accountId' | 'amountCents' | 'status'>): OfficeInvoice {
  return {
    label: 'Test',
    dueDate: '2026-06-01',
    createdAt: 1,
    ...partial,
  };
}

describe('officeBillingPayments', () => {
  it('tracks partial payments on an invoice', () => {
    const invoice = inv({ id: 'a', accountId: 'fam', amountCents: 10_000, status: 'sent', paidCents: 2_500 });
    expect(invoicePaidCents(invoice)).toBe(2_500);
    expect(invoiceRemainingCents(invoice)).toBe(7_500);
    expect(invoiceBalanceDueCents(invoice)).toBe(7_500);
    expect(resolveInvoiceStatusAfterPayment(invoice, 2_500)).toBe('partial');
    expect(resolveInvoiceStatusAfterPayment(invoice, 10_000)).toBe('paid');
  });

  it('allocates one payment across multiple invoices oldest first', () => {
    const invoices = [
      inv({ id: '1', accountId: 'fam', amountCents: 5_000, status: 'sent', dueDate: '2026-06-15' }),
      inv({ id: '2', accountId: 'fam', amountCents: 4_000, status: 'sent', dueDate: '2026-06-01' }),
    ];
    const allocations = autoAllocatePayment(invoices, 6_000, new Set(['1', '2']));
    expect(allocations).toEqual([
      { invoiceId: '2', amountCents: 4_000 },
      { invoiceId: '1', amountCents: 2_000 },
    ]);
  });

  it('derives account balance from remaining invoice amounts', () => {
    const invoices = [
      inv({ id: '1', accountId: 'fam', amountCents: 5_000, status: 'sent', paidCents: 1_000 }),
      inv({ id: '2', accountId: 'fam', amountCents: 3_000, status: 'paid', paidCents: 3_000 }),
      inv({ id: '3', accountId: 'fam', amountCents: 2_000, status: 'draft' }),
    ];
    expect(accountBalanceFromInvoices('fam', invoices)).toBe(4_000);
  });
});
