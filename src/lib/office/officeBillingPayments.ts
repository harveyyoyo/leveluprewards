import type { OfficeInvoice, OfficeInvoiceStatus, OfficePaymentMethod } from './types';

export type OfficePaymentAllocation = {
  invoiceId: string;
  amountCents: number;
};

export type OfficePaymentRecord = {
  id: string;
  accountId: string;
  amountCents: number;
  method: OfficePaymentMethod;
  note?: string | null;
  allocations: OfficePaymentAllocation[];
  createdAt: number;
};

export function invoicePaidCents(inv: OfficeInvoice): number {
  const paid = inv.paidCents ?? inv.paidAmountCents;
  if (typeof paid === 'number' && paid >= 0) {
    return Math.min(paid, inv.amountCents || 0);
  }
  if (inv.status === 'paid') return inv.amountCents || 0;
  return 0;
}

export function invoiceRemainingCents(inv: OfficeInvoice): number {
  if (inv.status === 'void' || inv.status === 'paid') return 0;
  return Math.max(0, (inv.amountCents || 0) - invoicePaidCents(inv));
}

/** Amount still owed on open invoices (drafts excluded until sent). */
export function invoiceBalanceDueCents(inv: OfficeInvoice): number {
  if (inv.status === 'void' || inv.status === 'paid' || inv.status === 'draft') return 0;
  return invoiceRemainingCents(inv);
}

export function isInvoicePayable(inv: OfficeInvoice): boolean {
  return (inv.status === 'sent' || inv.status === 'partial') && invoiceRemainingCents(inv) > 0;
}

export function resolveInvoiceStatusAfterPayment(
  inv: OfficeInvoice,
  newPaidCents: number,
): OfficeInvoiceStatus {
  const amount = inv.amountCents || 0;
  if (newPaidCents >= amount) return 'paid';
  if (newPaidCents > 0) return 'partial';
  return inv.status === 'draft' ? 'draft' : 'sent';
}

export function autoAllocatePayment(
  invoices: OfficeInvoice[],
  paymentCents: number,
  selectedIds: ReadonlySet<string>,
): OfficePaymentAllocation[] {
  if (paymentCents <= 0 || selectedIds.size === 0) return [];

  const open = invoices
    .filter((i) => isInvoicePayable(i) && selectedIds.has(i.id))
    .slice()
    .sort(
      (a, b) =>
        (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || (a.createdAt || 0) - (b.createdAt || 0),
    );

  let remaining = paymentCents;
  const allocations: OfficePaymentAllocation[] = [];
  for (const inv of open) {
    if (remaining <= 0) break;
    const due = invoiceRemainingCents(inv);
    const apply = Math.min(due, remaining);
    if (apply > 0) {
      allocations.push({ invoiceId: inv.id, amountCents: apply });
      remaining -= apply;
    }
  }
  return allocations;
}

export function sumPaymentAllocations(allocations: OfficePaymentAllocation[]): number {
  return allocations.reduce((sum, row) => sum + (row.amountCents || 0), 0);
}

export function accountBalanceFromInvoices(accountId: string, invoices: OfficeInvoice[]): number {
  return invoices
    .filter((i) => i.accountId === accountId)
    .reduce((sum, i) => sum + invoiceBalanceDueCents(i), 0);
}

export function applyPaymentToInvoice(
  inv: OfficeInvoice,
  allocationCents: number,
): Pick<OfficeInvoice, 'paidCents' | 'status' | 'paidAt' | 'paymentMethod' | 'paymentNote'> {
  const newPaid = invoicePaidCents(inv) + allocationCents;
  const status = resolveInvoiceStatusAfterPayment(inv, newPaid);
  return {
    paidCents: newPaid,
    status,
    paidAt: status === 'paid' ? Date.now() : inv.paidAt ?? null,
    paymentMethod: status === 'paid' ? inv.paymentMethod ?? null : inv.paymentMethod ?? null,
    paymentNote: inv.paymentNote ?? null,
  };
}
