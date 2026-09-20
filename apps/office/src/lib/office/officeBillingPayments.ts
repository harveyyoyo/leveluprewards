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

/** Stored payment total, not capped to the current invoice amount. */
export function recordedInvoicePaidCents(inv: OfficeInvoice): number {
  if (typeof inv.paidCents === 'number' && inv.paidCents >= 0) {
    return inv.paidCents;
  }
  if (inv.status === 'paid') return inv.amountCents || 0;
  return 0;
}

export function invoicePaidCents(inv: OfficeInvoice): number {
  return Math.min(recordedInvoicePaidCents(inv), inv.amountCents || 0);
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

/**
 * Apply a staff invoice edit (amount / label / due date / draft flag) and keep
 * paidCents + status consistent, including shrinking the amount below what was
 * already paid.
 */
export function applyInvoiceAmountEdit(
  existing: OfficeInvoice,
  next: { amountCents: number; label: string; dueDate: string; saveAsDraft: boolean },
): OfficeInvoice {
  const draftOrSentStatus: OfficeInvoiceStatus = next.saveAsDraft
    ? 'draft'
    : existing.status === 'draft'
      ? 'sent'
      : existing.status;
  const paidCents = Math.min(recordedInvoicePaidCents(existing), next.amountCents);
  const status: OfficeInvoiceStatus =
    draftOrSentStatus === 'draft'
      ? 'draft'
      : resolveInvoiceStatusAfterPayment(
          { ...existing, amountCents: next.amountCents, status: draftOrSentStatus },
          paidCents,
        );
  return {
    ...existing,
    label: next.label,
    amountCents: next.amountCents,
    dueDate: next.dueDate,
    status,
    paidCents,
  };
}
