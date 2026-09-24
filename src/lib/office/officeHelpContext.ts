import type { OfficeBillingAccount, OfficeGradeEntry, OfficeInvoice, OfficeStudent } from '@/lib/office/types';
import { isInvoiceDueSoon, isInvoiceOverdue, isInvoiceOpen, studentIdsWithGradesForTerm } from '@/lib/office/officeUtils';

export type OfficeAiHelpContext = {
  studentCount: number;
  familyCount: number;
  billingAccountCount: number;
  openInvoiceCount: number;
  openBalanceCents: number;
  overdueInvoiceCount: number;
  partialPaymentCount: number;
  marksTerminology: 'marks' | 'grades';
  topOverdueFamilies: string[];
  /** For "what needs doing": bills due in the next few days, and students with no grade yet this term. */
  dueSoonInvoiceCount?: number;
  termLabel?: string | null;
  studentsMissingGrades?: number;
};

export function buildOfficeAiHelpContext(params: {
  students: OfficeStudent[];
  families: { id: string; displayName: string }[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  useMarksTerminology?: boolean | null;
  gradeEntries?: OfficeGradeEntry[];
  termLabel?: string | null;
}): OfficeAiHelpContext {
  const graded = params.termLabel ? studentIdsWithGradesForTerm(params.gradeEntries ?? [], params.termLabel) : null;
  const activeStudents = params.students.filter((s) => (s.status ?? 'active') === 'active');
  const openInvoices = params.invoices.filter((i) => isInvoiceOpen(i));
  const overdue = params.invoices.filter((i) => isInvoiceOverdue(i));
  const accountNameById = new Map(params.billingAccounts.map((a) => [a.id, a.familyName]));

  const topOverdueFamilies = overdue
    .slice(0, 8)
    .map((inv) => accountNameById.get(inv.accountId) ?? 'Unknown account')
    .filter((name, idx, arr) => arr.indexOf(name) === idx);

  return {
    studentCount: params.students.length,
    familyCount: params.families.length,
    billingAccountCount: params.billingAccounts.length,
    openInvoiceCount: openInvoices.length,
    openBalanceCents: openInvoices.reduce(
      (sum, i) => sum + Math.max(0, (i.amountCents || 0) - (i.paidAmountCents || 0)),
      0,
    ),
    overdueInvoiceCount: overdue.length,
    partialPaymentCount: params.invoices.filter((i) => i.status === 'partial').length,
    marksTerminology: params.useMarksTerminology ? 'marks' : 'grades',
    topOverdueFamilies,
    dueSoonInvoiceCount: params.invoices.filter((i) => isInvoiceDueSoon(i)).length,
    termLabel: params.termLabel ?? null,
    studentsMissingGrades: graded ? activeStudents.filter((s) => !graded.has(s.id)).length : undefined,
  };
}

export function formatOfficeAiHelpContextBlock(ctx: OfficeAiHelpContext): string {
  const dollars = (ctx.openBalanceCents / 100).toFixed(2);
  const overdueLine =
    ctx.topOverdueFamilies.length > 0
      ? ctx.topOverdueFamilies.join(', ')
      : 'none listed';

  return [
    '**Live School Office snapshot (this session — no student PII beyond family payer names on overdue invoices)**',
    `- Roster: ${ctx.studentCount} students, ${ctx.familyCount} family profiles`,
    `- Billing: ${ctx.billingAccountCount} accounts, ${ctx.openInvoiceCount} open invoices, $${dollars} open balance`,
    `- Overdue: ${ctx.overdueInvoiceCount} invoice(s); partial payments in progress: ${ctx.partialPaymentCount}`,
    `- Terminology: staff UI uses "${ctx.marksTerminology}" labels`,
    `- Overdue family accounts (payer names only): ${overdueLine}`,
    ...(ctx.dueSoonInvoiceCount != null ? [`- Bills due in the next few days: ${ctx.dueSoonInvoiceCount}`] : []),
    ...(ctx.studentsMissingGrades != null
      ? [`- Students with no ${ctx.marksTerminology === 'marks' ? 'marks' : 'grades'} yet for ${ctx.termLabel}: ${ctx.studentsMissingGrades}`]
      : []),
    '',
    'When answering billing questions, use these counts. Do not invent balances or names beyond this list.',
    'For "what needs to be done" / "what should I do today": answer with a short to-do list from these numbers (overdue bills to follow up, bills due soon, students missing grades, and taking today’s attendance), most urgent first, and skip anything that is zero.',
  ].join('\n');
}
