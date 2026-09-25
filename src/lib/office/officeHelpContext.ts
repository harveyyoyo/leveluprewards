import type { OfficeBillingAccount, OfficeClass, OfficeGradeEntry, OfficeInvoice, OfficeStudent } from '@/lib/office/types';
import { isInvoiceDueSoon, isInvoiceOverdue, isInvoiceOpen, studentIdsWithGradesForTerm } from '@/lib/office/officeUtils';

export type OfficeAiHelpContext = {
  studentCount: number;
  familyCount: number;
  billingAccountCount: number;
  openInvoiceCount: number;
  openBalanceCents: number;
  overdueInvoiceCount: number;
  /** Families with at least one overdue bill (one family can have several). */
  overdueFamilyCount?: number;
  partialPaymentCount: number;
  marksTerminology: 'marks' | 'grades';
  topOverdueFamilies: string[];
  /** For "what needs doing": bills due in the next few days, and students with no grade yet this term. */
  dueSoonInvoiceCount?: number;
  termLabel?: string | null;
  studentsMissingGrades?: number;
  /** Active students in each class, largest first (for "which classes are biggest"). */
  classSizes?: { name: string; students: number }[];
};

export function buildOfficeAiHelpContext(params: {
  students: OfficeStudent[];
  families: { id: string; displayName: string }[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  useMarksTerminology?: boolean | null;
  gradeEntries?: OfficeGradeEntry[];
  termLabel?: string | null;
  classes?: Pick<OfficeClass, 'id' | 'name'>[];
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

  const studentsByClass = new Map<string, number>();
  for (const s of activeStudents) {
    if (s.classId) studentsByClass.set(s.classId, (studentsByClass.get(s.classId) ?? 0) + 1);
  }
  const classSizes = params.classes
    ?.map((c) => ({ name: c.name?.trim() || 'Unnamed class', students: studentsByClass.get(c.id) ?? 0 }))
    .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name, undefined, { numeric: true }));

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
    overdueFamilyCount: new Set(overdue.map((i) => i.accountId)).size,
    partialPaymentCount: params.invoices.filter((i) => i.status === 'partial').length,
    marksTerminology: params.useMarksTerminology ? 'marks' : 'grades',
    topOverdueFamilies,
    dueSoonInvoiceCount: params.invoices.filter((i) => isInvoiceDueSoon(i)).length,
    termLabel: params.termLabel ?? null,
    studentsMissingGrades: graded ? activeStudents.filter((s) => !graded.has(s.id)).length : undefined,
    classSizes,
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
    `- Overdue: ${ctx.overdueInvoiceCount} invoice(s)${
      ctx.overdueFamilyCount != null ? ` from ${ctx.overdueFamilyCount} ${ctx.overdueFamilyCount === 1 ? 'family' : 'families'}` : ''
    }; partial payments in progress: ${ctx.partialPaymentCount}`,
    `- Terminology: staff UI uses "${ctx.marksTerminology}" labels`,
    `- Overdue family accounts (payer names only): ${overdueLine}`,
    ...(ctx.dueSoonInvoiceCount != null ? [`- Bills due in the next few days: ${ctx.dueSoonInvoiceCount}`] : []),
    ...(ctx.studentsMissingGrades != null
      ? [`- Students with no ${ctx.marksTerminology === 'marks' ? 'marks' : 'grades'} yet for ${ctx.termLabel}: ${ctx.studentsMissingGrades}`]
      : []),
    ...(ctx.classSizes?.length
      ? [`- Students per class (active students, largest first): ${ctx.classSizes.map((c) => `${c.name} ${c.students}`).join('; ')}`]
      : []),
    '',
    'When answering billing questions, use these counts. Do not invent balances or names beyond this list.',
    'For "what needs to be done" / "what should I do today": answer with a short to-do list from these numbers (overdue bills to follow up, bills due soon, students missing grades, and taking today’s attendance), most urgent first, and skip anything that is zero. Count overdue bills and the families they belong to separately (e.g. "16 overdue bills from 14 families").',
  ].join('\n');
}
