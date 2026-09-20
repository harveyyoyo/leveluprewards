import { describe, expect, it } from 'vitest';
import {
  accountBalanceFromInvoices,
  applyInvoiceAmountEdit,
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

  it('caps paid/remaining and resolves to paid when an invoice amount is edited below what was already paid', () => {
    // e.g. a $10 invoice with an $8 partial payment gets corrected down to $5.
    const original = inv({ id: 'a', accountId: 'fam', amountCents: 10_000, status: 'partial', paidCents: 8_000 });
    const edited = applyInvoiceAmountEdit(original, {
      amountCents: 5_000,
      label: 'Tuition',
      dueDate: original.dueDate,
      saveAsDraft: false,
    });
    expect(edited.paidCents).toBe(5_000);
    expect(edited.status).toBe('paid');
    expect(invoiceRemainingCents(edited)).toBe(0);
    expect(accountBalanceFromInvoices('fam', [edited])).toBe(0);
  });

  it('keeps leftover payment when a partially paid invoice is increased', () => {
    const original = inv({ id: 'a', accountId: 'fam', amountCents: 5_000, status: 'partial', paidCents: 4_000 });
    const edited = applyInvoiceAmountEdit(original, {
      amountCents: 10_000,
      label: 'Tuition',
      dueDate: original.dueDate,
      saveAsDraft: false,
    });
    expect(edited.paidCents).toBe(4_000);
    expect(edited.status).toBe('partial');
    expect(invoiceRemainingCents(edited)).toBe(6_000);
    expect(accountBalanceFromInvoices('fam', [edited])).toBe(6_000);
  });

  it('leaves drafts as drafts until they are sent', () => {
    const original = inv({ id: 'a', accountId: 'fam', amountCents: 10_000, status: 'draft' });
    const stillDraft = applyInvoiceAmountEdit(original, {
      amountCents: 8_000,
      label: 'Tuition',
      dueDate: original.dueDate,
      saveAsDraft: true,
    });
    expect(stillDraft.status).toBe('draft');
    expect(accountBalanceFromInvoices('fam', [stillDraft])).toBe(0);

    const sent = applyInvoiceAmountEdit(original, {
      amountCents: 8_000,
      label: 'Tuition',
      dueDate: original.dueDate,
      saveAsDraft: false,
    });
    expect(sent.status).toBe('sent');
    expect(accountBalanceFromInvoices('fam', [sent])).toBe(8_000);
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
